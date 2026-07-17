// src/app/api/admin/bulk-email/route.ts
// ═════════════════════════════════════════════════════════════
// PULSEMARKET — Admin: Envoi de mail groupé
// Envoie un message libre (sujet + corps texte) à un segment de
// destinataires. Envois séquentiels avec petite pause pour rester
// raisonnable côté Resend (pas de vrai bulk API utilisé ici).
// ═════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { requireAdmin } from '@/lib/adminAuth'
import { validateBody } from '@/lib/validation'

const resend = new Resend(process.env.RESEND_API_KEY)

const bulkEmailSchema = z.object({
  segment: z.enum(['mairies_all', 'mairies_pending', 'mairies_approved', 'exposants_all', 'exposants_pro', 'exposants_free']),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(20000), // texte libre, converti en paragraphes
})

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function textToHtml(text: string): string {
  return escapeHtml(text)
    .split('\n\n')
    .map(p => `<p style="margin: 0 0 14px; font-size: 14px; color: #334155; line-height: 1.7;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    const { supabase } = admin

    if (!process.env.RESEND_API_KEY) {
      console.error('[admin/bulk-email] RESEND_API_KEY manquant')
      return NextResponse.json({ error: 'Configuration invalide' }, { status: 500 })
    }

    const result = await validateBody(req, bulkEmailSchema)
    if (result instanceof NextResponse) return result
    const { segment, subject, message } = result

    // ─── Résout le segment en liste d'emails ───
    let query = supabase.from('profiles').select('email, full_name, organisation_name')

    if (segment.startsWith('mairies')) {
      query = query.eq('role', 'organisateur')
      if (segment === 'mairies_pending') query = query.eq('organisateur_status', 'pending')
      if (segment === 'mairies_approved') query = query.eq('organisateur_status', 'approved')
    } else {
      query = query.eq('role', 'exposant')
      if (segment === 'exposants_pro') query = query.eq('plan', 'pro')
      if (segment === 'exposants_free') query = query.or('plan.eq.free,plan.is.null')
    }

    const { data: recipients, error: queryError } = await query.limit(500)
    if (queryError) {
      console.error('[admin/bulk-email] Query error:', queryError)
      return NextResponse.json({ error: 'Erreur récupération destinataires' }, { status: 500 })
    }
    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'Aucun destinataire pour ce segment' }, { status: 400 })
    }

    // ─── Envoi séquentiel avec petite pause anti rate-limit Resend ───
    let sent = 0
    let failed = 0
    const bodyHtml = textToHtml(message)

    for (const r of recipients) {
      if (!r.email) { failed++; continue }
      const displayName = r.organisation_name || r.full_name || ''
      const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #F8FAFC; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 28px; border: 1px solid #E2E8F0;">
    <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #4F46E5; text-transform: uppercase; letter-spacing: 0.06em;">PulseMarket</p>
    ${displayName ? `<p style="margin: 0 0 16px; font-size: 13px; color: #94A3B8;">Bonjour ${escapeHtml(displayName)},</p>` : ''}
    ${bodyHtml}
    <p style="margin: 24px 0 0; font-size: 12px; color: #94A3B8; border-top: 1px solid #F1F5F9; padding-top: 14px;">
      PulseMarket SAS — pulse-market.fr
    </p>
  </div>
</body></html>
      `.trim()

      try {
        const { error } = await resend.emails.send({
          from: 'PulseMarket <noreply@pulse-market.fr>',
          to: r.email,
          subject,
          html,
        })
        if (error) { failed++ } else { sent++ }
      } catch {
        failed++
      }

      // Petite pause pour rester sous les limites de débit Resend
      await new Promise(res => setTimeout(res, 150))
    }

    return NextResponse.json({ success: true, sent, failed, total: recipients.length })

  } catch (err: any) {
    console.error('[admin/bulk-email] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}