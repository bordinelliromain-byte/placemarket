// src/app/api/create-checkout-session/route.ts
// ═════════════════════════════════════════════════════════════
// PULSEMARKET — Create Checkout Session (AOT candidature)
// Crée une session Stripe pour le paiement d'une candidature validée
//
// 🔧 FIX SÉCURITÉ : le montant n'est plus jamais reçu depuis le
// client. Il est recalculé côté serveur à partir de events.price_per_spot,
// la seule source de vérité. Avant ce fix, un exposant pouvait
// modifier le montant envoyé par son navigateur et payer moins
// cher que le vrai tarif du marché.
// ═════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { securityLog } from '@/lib/securityLog'
import {
  validateBody,
  checkRateLimit,
  emailSchema,
  uuidSchema,
  RATE_LIMIT_CHECKOUT,
} from '@/lib/validation'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// ─── Frais de service fixes (inchangé) ───
const SERVICE_FEE_CENTS = 200 // 2€

// ─── Schéma Zod strict ───
// ✅ FIX : "amount" a été retiré du schéma. On ne fait plus jamais
// confiance à un montant envoyé par le client pour un paiement.
const checkoutSchema = z.object({
  candidatureId: uuidSchema,
  exposantEmail: emailSchema,
  exposantNom: z.string().trim().min(1).max(200).optional(),
})

// ═════════════════════════════════════════════════════════════
// POST /api/create-checkout-session
// ═════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'

    // ─── 1. Rate limit (3/min - strict pour checkout) ───
    const limited = checkRateLimit(req, {
      ...RATE_LIMIT_CHECKOUT,
      keyPrefix: 'create-checkout',
    })
    if (limited) {
      await securityLog({
        action: 'rate_limit_atteint',
        ip,
        details: { route: 'create-checkout-session' }
      })
      return limited
    }

    // ─── 2. Vérifier env vars critiques ───
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[create-checkout] STRIPE_SECRET_KEY manquant')
      return NextResponse.json({ error: 'Configuration serveur invalide' }, { status: 500 })
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[create-checkout] SUPABASE_SERVICE_ROLE_KEY manquant')
      return NextResponse.json({ error: 'Configuration serveur invalide' }, { status: 500 })
    }
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.error('[create-checkout] NEXT_PUBLIC_APP_URL manquant')
      return NextResponse.json({ error: 'Configuration serveur invalide' }, { status: 500 })
    }

    // ─── 3. Validation Zod ───
    const result = await validateBody(req, checkoutSchema)
    if (result instanceof NextResponse) return result
    const { candidatureId, exposantEmail, exposantNom } = result

    // ─── 4. Client Supabase admin ───
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ─── 5. Vérifier que la candidature existe ET est validée ───
    // ✅ FIX : on récupère aussi events.price_per_spot et events.title
    // dans la MÊME requête, directement depuis la base — c'est cette
    // valeur, et uniquement celle-ci, qui servira à calculer le prix.
    const { data: candidature, error: dbError } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        event_id,
        exposant_id,
        events:event_id (
          title,
          price_per_spot,
          status
        )
      `)
      .eq('id', candidatureId)
      .single()

    if (dbError || !candidature) {
      return NextResponse.json({ error: 'Candidature introuvable' }, { status: 404 })
    }

    // ─── 6. ✅ SÉCURITÉ : status doit être 'validated' (pas paid, pas pending) ───
    if (candidature.status !== 'validated') {
      await securityLog({
        action: 'acces_non_autorise',
        ip,
        userId: candidature.exposant_id,
        details: {
          reason: 'candidature_non_validee',
          candidatureId,
          actualStatus: candidature.status,
        }
      })

      let errorMsg = 'Candidature non validée'
      if (candidature.status === 'paid') errorMsg = 'Cette candidature a déjà été payée'
      else if (candidature.status === 'rejected') errorMsg = 'Cette candidature a été refusée'
      else if (candidature.status === 'pending') errorMsg = 'Cette candidature est en attente de validation'

      return NextResponse.json({ error: errorMsg }, { status: 403 })
    }

    // ─── 7. ✅ FIX PRINCIPAL : le prix vient EXCLUSIVEMENT de la base ───
    const event = (candidature as any).events
    const eventTitle: string = event?.title || 'Marché'
    const pricePerSpot: number = Number(event?.price_per_spot ?? 0)

    if (!pricePerSpot || pricePerSpot <= 0) {
      console.error('[create-checkout] price_per_spot invalide pour event', candidature.event_id)
      return NextResponse.json({
        error: 'Tarif introuvable pour ce marché. Contactez l\'organisateur.'
      }, { status: 400 })
    }

    // Sécurité additionnelle : borne raisonnable pour éviter une valeur
    // aberrante en base (même si elle vient de nous, on se protège)
    if (pricePerSpot > 10000) {
      console.error('[create-checkout] price_per_spot suspect (>10000€) pour event', candidature.event_id)
      return NextResponse.json({ error: 'Configuration tarifaire invalide' }, { status: 500 })
    }

    const amountCents = Math.round(pricePerSpot * 100)

    // ─── 8. Création session Stripe ───
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: exposantEmail,
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Redevance AOT — ${eventTitle.substring(0, 100)}`,
                description: exposantNom
                  ? `Emplacement marché · ${exposantNom.substring(0, 100)}`
                  : 'Emplacement marché',
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: 'Frais de service PulseMarket',
                description: 'Gestion candidature + vérification dossier',
              },
              unit_amount: SERVICE_FEE_CENTS,
            },
            quantity: 1,
          },
        ],
        metadata: {
          candidatureId,
          exposantNom: (exposantNom || '').substring(0, 500),
          eventTitle: eventTitle.substring(0, 500),
          // ✅ On garde une trace du prix appliqué pour l'audit / support
          pricePerSpotCents: String(amountCents),
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/paiement-success?session_id={CHECKOUT_SESSION_ID}&candidature_id=${candidatureId}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min
      })
    } catch (stripeErr: any) {
      console.error('[create-checkout] Stripe error:', stripeErr.message)
      return NextResponse.json({
        error: 'Erreur Stripe lors de la création du paiement'
      }, { status: 502 })
    }

    // ─── 9. Log paiement initié ───
    await securityLog({
      action: 'paiement_initie',
      ip,
      userId: candidature.exposant_id,
      details: {
        candidatureId,
        eventTitle,
        amount: pricePerSpot,
        sessionId: session.id
      }
    })

    return NextResponse.json({
      url: session.url,
      sessionId: session.id
    })

  } catch (err: any) {
    console.error('[create-checkout] Error:', err)
    return NextResponse.json({
      error: 'Erreur serveur',
      ...(process.env.NODE_ENV === 'development' && { details: err.message }),
    }, { status: 500 })
  }
}