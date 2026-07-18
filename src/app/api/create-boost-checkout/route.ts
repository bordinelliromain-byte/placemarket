// src/app/api/create-boost-checkout/route.ts
// ═════════════════════════════════════════════════════════════
// PULSEMARKET — Create Boost Checkout ("Boost My Business" ads)
//
// 🔧 FIX 1 (bug) : la vérification "max 3 pubs par marché" tapait
// sur une table `ads` qui n'existe pas (la vraie table est
// `boost_ads`). Comme l'erreur n'était pas vérifiée, le count
// retombait toujours à 0 → la limite de 3 n'était JAMAIS appliquée.
//
// 🔧 FIX 2 (cohérence sécurité) : alignement avec les routes
// soeurs (create-exposant-boost-checkout, create-mairie-boost-checkout) :
// validation Zod, rate limiter partagé, securityLog.
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

// ─── Constantes ───
const BOOST_PRICE_CENTS = 2000 // 20€
const MAX_ADS_PER_EVENT = 3

// ─── Schéma Zod strict (remplace la validation manuelle) ───
const boostAdsSchema = z.object({
  nom: z.string().trim().min(1, 'Nom requis').max(200, 'Nom trop long'),
  offre: z.string().trim().max(200).optional(),
  detail: z.string().trim().max(500).optional(),
  adresse: z.string().trim().max(300).optional(),
  photoUrl: z.string().trim().max(1000).optional(),
  eventId: uuidSchema,
  eventTitle: z.string().trim().max(200).optional(),
  email: emailSchema,
})

// ═════════════════════════════════════════════════════════════
// POST /api/create-boost-checkout
// ═════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'

    // ─── 1. Rate limit (aligné sur les routes soeurs : 3/min) ───
    const limited = checkRateLimit(req, {
      ...RATE_LIMIT_CHECKOUT,
      keyPrefix: 'create-boost-checkout',
    })
    if (limited) {
      await securityLog({
        action: 'rate_limit_atteint',
        ip,
        details: { route: 'create-boost-checkout' }
      })
      return limited
    }

    // ─── 2. Vérifier env vars critiques ───
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[create-boost-checkout] STRIPE_SECRET_KEY manquant')
      return NextResponse.json({ error: 'Configuration serveur invalide' }, { status: 500 })
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[create-boost-checkout] SUPABASE_SERVICE_ROLE_KEY manquant')
      return NextResponse.json({ error: 'Configuration serveur invalide' }, { status: 500 })
    }
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.error('[create-boost-checkout] NEXT_PUBLIC_APP_URL manquant')
      return NextResponse.json({ error: 'Configuration serveur invalide' }, { status: 500 })
    }

    // ─── 3. Validation Zod ───
    const result = await validateBody(req, boostAdsSchema)
    if (result instanceof NextResponse) return result
    const { nom, offre, detail, adresse, photoUrl, eventId, eventTitle, email } = result

    // ─── 4. Client Supabase admin ───
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ─── 5. Vérifier que l'événement existe et est publié ───
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status, title')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })
    }

    if (event.status !== 'published') {
      return NextResponse.json({ error: 'Cet événement n\'est pas disponible' }, { status: 403 })
    }

    // ─── 6. ✅ FIX : vérifier max 3 slots pub — bonne table (boost_ads) ───
    const { count, error: countError } = await supabase
      .from('boost_ads')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'active')

    if (countError) {
      // ✅ On ne laisse plus passer silencieusement en cas d'erreur —
      // avant, une erreur ici faisait planter le count à null → 0,
      // et donc désactivait la limite sans prévenir personne.
      console.error('[create-boost-checkout] Count error:', countError)
      return NextResponse.json({ error: 'Erreur lors de la vérification des disponibilités' }, { status: 500 })
    }

    if ((count || 0) >= MAX_ADS_PER_EVENT) {
      return NextResponse.json(
        { error: 'Les 3 emplacements publicitaires de ce marché sont déjà pris.' },
        { status: 400 }
      )
    }

    // ─── 7. Création session Stripe ───
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Boost My Business — ${(event.title || '').substring(0, 100)}`,
              description: `${nom.substring(0, 100)}${offre ? ` · ${offre.substring(0, 100)}` : ''}`,
            },
            unit_amount: BOOST_PRICE_CENTS,
          },
          quantity: 1,
        }],
        metadata: {
          nom: nom.substring(0, 500),
          offre: (offre || '').substring(0, 500),
          detail: (detail || '').substring(0, 500),
          adresse: (adresse || '').substring(0, 500),
          photoUrl: (photoUrl || '').substring(0, 500),
          eventId,
          eventTitle: (eventTitle || event.title || '').substring(0, 500),
          email: email.substring(0, 500),
          type: 'boost',
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pro/ads/success?session_id={CHECKOUT_SESSION_ID}&nom=${encodeURIComponent(nom)}&event=${encodeURIComponent(event.title || '')}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pro/ads/new`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min — aligné sur les routes soeurs
      })
    } catch (stripeErr: any) {
      console.error('[create-boost-checkout] Stripe error:', stripeErr.message)
      return NextResponse.json({
        error: 'Erreur Stripe lors de la création du paiement'
      }, { status: 502 })
    }

    // ─── 8. Log paiement initié (comme les routes soeurs) ───
    await securityLog({
      action: 'paiement_initie',
      ip,
      details: {
        type: 'boost',
        eventId,
        nom,
        sessionId: session.id,
      }
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })

  } catch (err: any) {
    console.error('[create-boost-checkout] Error:', err)
    return NextResponse.json({
      error: 'Erreur serveur',
      ...(process.env.NODE_ENV === 'development' && { details: err.message }),
    }, { status: 500 })
  }
}