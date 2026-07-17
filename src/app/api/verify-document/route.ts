// src/app/api/verify-document/route.ts
// ═════════════════════════════════════════════════════════════
// PULSEMARKET — API Verify Document (v3 — OpenAI, sans rendu PDF→image)
// PDF : extraction de texte pur (unpdf, zéro dépendance canvas/DOMMatrix,
//       fiable en serverless Vercel) → analysé par GPT-4o en mode texte.
// Images (JPEG/PNG/WEBP) : envoyées directement à GPT-4o Vision.
// ═════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMIT_STRICT } from '@/lib/validation'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// ─── Limites strictes ───
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const ALLOWED_DOC_TYPES = ['kbis', 'assurance', 'rc-pro', 'attestation', 'piece-identite']

// Seuil en dessous duquel on considère que le PDF n'a pas de vraie couche
// texte exploitable (probablement un scan/photo collé dans un PDF)
const MIN_PDF_TEXT_LENGTH = 30

// ─── Magic bytes (signatures de fichiers) — anti spoof MIME ───
const MAGIC_BYTES: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF, 0xE0],
    [0xFF, 0xD8, 0xFF, 0xE1],
    [0xFF, 0xD8, 0xFF, 0xE2],
    [0xFF, 0xD8, 0xFF, 0xE3],
    [0xFF, 0xD8, 0xFF, 0xDB],
  ],
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF
}

function validateMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 16))
  const signatures = MAGIC_BYTES[mimeType]
  if (!signatures) return false
  return signatures.some(sig => sig.every((byte, i) => bytes[i] === byte))
}

// ─── Similarité texte (pour comparer nom saisi vs nom extrait par l'IA) ───
function similarity(a: string, b: string): number {
  const s1 = a.toLowerCase().replace(/[^a-z0-9]/g, '')
  const s2 = b.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (s1 === s2) return 1
  if (s1.includes(s2) || s2.includes(s1)) return 0.8
  const w1 = s1.split(' ')
  const w2 = s2.split(' ')
  return w1.filter(w => w2.includes(w)).length / Math.max(w1.length, w2.length)
}

// ─── Extrait le texte brut d'un PDF (sans rendu image — pas de canvas/DOMMatrix) ───
async function extractPdfText(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf')
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { text } = await extractText(pdf, { mergePages: true })
  return (text || '').trim()
}

// ═════════════════════════════════════════════════════════════
// Schéma JSON attendu de GPT-4o — extraction structurée
// ═════════════════════════════════════════════════════════════
const EXTRACTION_JSON_SCHEMA = {
  name: 'document_extraction',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      readable: { type: 'boolean', description: 'Le document est-il lisible et exploitable ?' },
      document_type_detected: {
        type: 'string',
        description: 'Type de document détecté (ex: Kbis, attestation assurance RC Pro, carte identité, etc.)',
      },
      siren: { type: ['string', 'null'], description: '9 chiffres du SIREN si présent sur le document, sinon null' },
      business_name: { type: ['string', 'null'], description: 'Raison sociale / nom de l\'entreprise si présent, sinon null' },
      issue_date: { type: ['string', 'null'], description: 'Date d\'émission/édition du document au format YYYY-MM-DD, sinon null' },
      expiry_date: { type: ['string', 'null'], description: 'Date d\'expiration/fin de validité au format YYYY-MM-DD si applicable (ex: attestation assurance), sinon null' },
      is_currently_valid: {
        type: ['boolean', 'null'],
        description: 'En comparant expiry_date à la date du jour fournie, le document est-il encore valide aujourd\'hui ? null si pas de date d\'expiration applicable au type de document',
      },
      validity_reasoning: {
        type: 'string',
        description: 'Explication courte (1-2 phrases) du raisonnement sur la validité : quelle date a été utilisée et pourquoi',
      },
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'Confiance globale dans l\'extraction (qualité du texte/image, ambiguïté du document)',
      },
    },
    required: [
      'readable', 'document_type_detected', 'siren', 'business_name',
      'issue_date', 'expiry_date', 'is_currently_valid', 'validity_reasoning', 'confidence',
    ],
    additionalProperties: false,
  },
}

const SYSTEM_PROMPT = (todayISO: string) => `Tu es un assistant de vérification documentaire pour une plateforme B2B (PulseMarket) qui valide les documents professionnels d'exposants de marchés municipaux (Kbis, attestations d'assurance RC Pro, etc.).

Aujourd'hui nous sommes le ${todayISO}. Utilise cette date pour déterminer si un document est encore valide.

Règles strictes :
- N'invente JAMAIS une date, un SIREN ou un nom si tu ne les vois pas clairement dans le contenu fourni. Mets null plutôt que de deviner.
- Un Kbis n'a généralement pas de date d'expiration propre — pour ce type de document, is_currently_valid doit être null sauf mention explicite de validité, et on se base plutôt sur la fraîcheur de l'issue_date.
- Une attestation d'assurance a presque toujours une date de fin de validité explicite — cherche-la précisément.
- Si le contenu est vide, incohérent ou manifestement pas un document professionnel, mets readable: false et confidence: "low", et laisse les autres champs à null quand tu n'es pas sûr.
- Sois honnête sur ton niveau de confiance.`

async function callOpenAIExtraction(messages: any[]): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)

  let res: Response
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        messages,
        response_format: { type: 'json_schema', json_schema: EXTRACTION_JSON_SCHEMA },
      }),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
  return res
}

// ═════════════════════════════════════════════════════════════
// POST /api/verify-document
// FormData : { file, type, siren?, businessName?, otherDocText? }
// ═════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    // ─── 1. Rate limit STRICT (coûteux — appel OpenAI) ───
    const limited = checkRateLimit(req, {
      ...RATE_LIMIT_STRICT,
      keyPrefix: 'verify-document',
    })
    if (limited) return limited

    // ─── 2. Vérifier env vars ───
    if (!OPENAI_API_KEY) {
      console.error('[verify-document] OPENAI_API_KEY manquant')
      return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 })
    }

    // ─── 3. Parse FormData ───
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'FormData invalide' }, { status: 400 })
    }

    const file = formData.get('file') as File | null
    const docType = String(formData.get('type') || '').substring(0, 50)
    const userSiren = String(formData.get('siren') || '').substring(0, 20).replace(/\s/g, '')
    const userBusinessName = String(formData.get('businessName') || '').substring(0, 200)
    const otherDocText = String(formData.get('otherDocText') || '').substring(0, 10000)

    // ─── 4. Validation fichier ───
    if (!file) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    }
    if (docType && !ALLOWED_DOC_TYPES.includes(docType)) {
      return NextResponse.json({ error: 'Type de document non supporté' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` }, { status: 400 })
    }
    if (file.size < 100) {
      return NextResponse.json({ error: 'Fichier trop petit ou corrompu' }, { status: 400 })
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Format non supporté (PDF, JPG, PNG, WEBP uniquement)' }, { status: 400 })
    }

    // ─── 5. Lire le fichier ───
    const arrayBuffer = await file.arrayBuffer()

    // ─── 6. ✅ ANTI-SPOOF MIME : magic bytes ───
    if (!validateMagicBytes(arrayBuffer, file.type)) {
      console.warn('[verify-document] Magic bytes mismatch:', file.type)
      return NextResponse.json({ error: 'Fichier corrompu ou type incorrect (MIME spoofing detected)' }, { status: 400 })
    }

    const todayISO = new Date().toISOString().split('T')[0]
    let openaiMessages: any[]

    // ─── 7a. CAS PDF — extraction texte pur (pas de rendu image) ───
    if (file.type === 'application/pdf') {
      let pdfText: string
      try {
        pdfText = await extractPdfText(Buffer.from(arrayBuffer))
      } catch (pdfErr: any) {
        console.error('[verify-document] PDF text extraction error:', pdfErr.message)
        return NextResponse.json({ error: 'Impossible de lire ce PDF' }, { status: 400 })
      }

      // Si trop peu de texte extrait, c'est probablement un scan/photo sans couche texte
      if (pdfText.length < MIN_PDF_TEXT_LENGTH) {
        return NextResponse.json({
          success: false,
          error: 'Ce PDF semble être un scan/image sans texte exploitable. Merci de le renvoyer au format JPG ou PNG (photo du document).',
          score: 0,
          checks: {},
        }, { status: 200 })
      }

      openaiMessages = [
        { role: 'system', content: SYSTEM_PROMPT(todayISO) },
        {
          role: 'user',
          content: `Analyse ce document (type déclaré par l'utilisateur : ${docType || 'non précisé'}). Voici le texte extrait du PDF :\n\n---\n${pdfText.substring(0, 8000)}\n---\n\nExtrais les informations selon le schéma demandé.`,
        },
      ]
    }
    // ─── 7b. CAS IMAGE — envoi direct à GPT-4o Vision ───
    else {
      const imageBase64 = Buffer.from(arrayBuffer).toString('base64')
      openaiMessages = [
        { role: 'system', content: SYSTEM_PROMPT(todayISO) },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Analyse ce document (type déclaré par l'utilisateur : ${docType || 'non précisé'}). Extrais les informations selon le schéma demandé.` },
            { type: 'image_url', image_url: { url: `data:${file.type};base64,${imageBase64}` } },
          ],
        },
      ]
    }

    // ─── 8. Appel OpenAI ───
    let openaiRes: Response
    try {
      openaiRes = await callOpenAIExtraction(openaiMessages)
    } catch (fetchErr: any) {
      console.error('[verify-document] OpenAI fetch error:', fetchErr.message)
      return NextResponse.json({ error: 'Service IA temporairement indisponible' }, { status: 503 })
    }

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text().catch(() => '')
      console.error('[verify-document] OpenAI status:', openaiRes.status, errBody.substring(0, 500))
      return NextResponse.json({ error: 'Erreur lors de l\'analyse du document' }, { status: 502 })
    }

    let openaiData: any
    try {
      openaiData = await openaiRes.json()
    } catch (parseErr) {
      console.error('[verify-document] Parse JSON error:', parseErr)
      return NextResponse.json({ error: 'Réponse IA invalide' }, { status: 502 })
    }

    const rawContent = openaiData.choices?.[0]?.message?.content
    if (!rawContent) {
      return NextResponse.json({ success: false, error: 'Impossible de lire le document', score: 0, checks: {} })
    }

    let extraction: {
      readable: boolean
      document_type_detected: string
      siren: string | null
      business_name: string | null
      issue_date: string | null
      expiry_date: string | null
      is_currently_valid: boolean | null
      validity_reasoning: string
      confidence: 'high' | 'medium' | 'low'
    }
    try {
      extraction = JSON.parse(rawContent)
    } catch {
      console.error('[verify-document] Extraction JSON parse error:', rawContent?.substring(0, 300))
      return NextResponse.json({ success: false, error: 'Extraction IA illisible', score: 0, checks: {} })
    }

    if (!extraction.readable) {
      return NextResponse.json({
        success: false,
        error: 'Document illisible ou de mauvaise qualité',
        score: 0,
        checks: {},
        aiConfidence: extraction.confidence,
      })
    }

    // ─── 9. Checks de validation ───
    const extractedSiren = extraction.siren ? extraction.siren.replace(/\s/g, '') : null
    const extractedBusinessName = extraction.business_name

    const checks: Record<string, boolean> = {}
    checks.readable = extraction.readable
    checks.sirenMatch = userSiren && extractedSiren
      ? extractedSiren === userSiren
      : extractedSiren !== null
    checks.nameMatch = userBusinessName && extractedBusinessName
      ? similarity(userBusinessName, extractedBusinessName) > 0.6
      : extractedBusinessName !== null

    if (extraction.is_currently_valid !== null) {
      checks.notExpired = extraction.is_currently_valid
    } else if (extraction.issue_date) {
      const issue = new Date(extraction.issue_date)
      const now = new Date()
      checks.notExpired = !isNaN(issue.getTime()) && (now.getTime() - issue.getTime()) < 90 * 24 * 60 * 60 * 1000
    } else {
      checks.notExpired = false
    }

    checks.crossValid = otherDocText && extractedBusinessName
      ? (
        similarity(extractedBusinessName, otherDocText) > 0.3
        || (extractedSiren !== null && otherDocText.replace(/\s/g, '').includes(extractedSiren))
      )
      : true

    const score = Object.values(checks).filter(Boolean).length
    const total = Object.keys(checks).length
    const badge = score === total
      ? 'platinum'
      : score >= total - 1
        ? 'verifie'
        : score >= total - 2
          ? 'partiel'
          : 'incomplet'

    const badgeLabel = {
      platinum: '💎 Dossier Platinum',
      verifie: '✅ Dossier Vérifié',
      partiel: '⚠️ Dossier Partiel',
      incomplet: '❌ Dossier Incomplet',
    }[badge]

    const daysUntilExpiry = extraction.expiry_date
      ? Math.ceil((new Date(extraction.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

    return NextResponse.json({
      success: true,
      documentTypeDetected: extraction.document_type_detected,
      extractedSiren,
      extractedBusinessName,
      expiryDate: extraction.expiry_date,
      issueDate: extraction.issue_date,
      daysUntilExpiry,
      isCurrentlyValid: extraction.is_currently_valid,
      validityReasoning: extraction.validity_reasoning,
      aiConfidence: extraction.confidence,
      checks,
      score,
      total,
      badge,
      badgeLabel,
    })

  } catch (err: any) {
    console.error('[verify-document] Error:', err)
    return NextResponse.json({
      error: 'Erreur serveur',
      ...(process.env.NODE_ENV === 'development' && { details: err.message }),
    }, { status: 500 })
  }
}