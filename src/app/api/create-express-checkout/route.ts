// src/app/api/create-express-checkout/route.ts
// ═════════════════════════════════════════════════════════════
// PULSEMARKET — Create Express Checkout (paiement placier rapide)
// Crée une session Stripe pour un paiement express sur le terrain
// Utilisé par les placiers quand un forain arrive sans candidature
//
// 🔧 FIX SÉCURITÉ : cette route ne vérifiait pas du tout qui
// l'appelait — n'importe qui connaissant l'URL pouvait générer des
// liens de paiement en se faisant passer pour PulseMarket. Elle
// exige maintenant une session valide avec le rôle "placier".
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
  RATE_LIMIT_CHECKOUT,
} from '@/lib/validation'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// ─── Schéma Zod strict ───
const expressCheckoutSchema = z.object({
  nom: z.string().trim().min(1, 'Nom requis').max(200, 'Nom trop long'),
  email: emailSchema,
  montant: z.union([
    z.number(),
    z.string().transform((val) => parseFloat(val)),
  ]).refine(
    (val) => !isNaN(val) && val > 0 && val <= 10000,
    { message: 'Montant invalide (entre 0,01€ et 10 000€)' }
  ),
  eventTitle: z.string().trim().max(200).optional(),
  eventId: z.string().max(100).optional(),
})

// ─── ✅ FIX : vérifie que l'appelant est bien un placier connecté ───
async function requirePlacier(req: NextRequest): Promise<
  { userId: string; mairieId: string | null } | null
> {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('[create-express-checkout] Env vars manquantes')
    return null
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, mairie_id')
    .eq('id', userData.user.id)
    .single()

  if (profile?.role !== 'placier') return null

  return { userId: userData.user.id, mairieId: profile.mairie_id }
}

// ═════════════════════════════════════════════════════════════
// POST /api/create-express-checkout
// ═════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'

    // ─── 1. Rate limit (3/min - checkout strict) ───
    const limited = checkRateLimit(req, {
      ...RATE_LIMIT_CHECKOUT,
      keyPrefix: 'create-express-checkout',
    })
    if (limited) {
      await securityLog({
        action: 'rate_limit_atteint',
        ip,
        details: { route: 'create-express-checkout' }
      })
      return limited
    }

    // ─── 2. ✅ FIX : authentification placier obligatoire ───
    const placier = await requirePlacier(req)
    if (!placier) {
      await securityLog({
        action: 'acces_non_autorise',
        ip,
        details: { reason: 'placier_non_authentifie', route: 'create-express-checkout' }
      })
      return NextResponse.json({ error: 'Non autorisé — connectez-vous en tant que placier' }, { status: 401 })
    }

    // ─── 3. Vérifier env vars critiques ───
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[create-express-checkout] STRIPE_SECRET_KEY manquant')
      return NextResponse.json({ error: 'Configuration serveur invalide' }, { status: 500 })
    }
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.error('[create-express-checkout] NEXT_PUBLIC_APP_URL manquant')
      return NextResponse.json({ error: 'Configuration serveur invalide' }, { status: 500 })
    }

    // ─── 4. Validation Zod ───
    const result = await validateBody(req, expressCheckoutSchema)
    if (result instanceof NextResponse) return result
    const { nom, email, montant, eventTitle, eventId } = result

    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    // ─── 5. Créer la session Stripe ───
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
              name: `Place marché — ${(eventTitle || 'Marché PulseMarket').substring(0, 100)}`,
              description: `Forain : ${nom.substring(0, 100)} · Paiement express placier`,
            },
            unit_amount: Math.round(montant * 100), // En centimes
          },
          quantity: 1,
        }],
        success_url: `${appUrl}/paiement-express/success?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}&nom=${encodeURIComponent(nom)}&event=${encodeURIComponent(eventTitle || '')}&montant=${montant}`,
        cancel_url: `${appUrl}/dashboard/placier`,
        metadata: {
          type: 'express',
          nom: nom.substring(0, 500),
          email: email.substring(0, 500),
          eventId: (eventId || '').substring(0, 500),
          eventTitle: (eventTitle || '').substring(0, 500),
          // ✅ On trace maintenant QUEL placier a généré ce paiement
          placierId: placier.userId,
        },
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min
      })
    } catch (stripeErr: any) {
      console.error('[create-express-checkout] Stripe error:', stripeErr.message)
      return NextResponse.json({
        error: 'Erreur Stripe lors de la création du paiement'
      }, { status: 502 })
    }

    // ─── 6. Log paiement initié (avec l'identité du placier) ───
    await securityLog({
      action: 'paiement_initie',
      ip,
      userId: placier.userId,
      details: {
        type: 'express',
        nom,
        email,
        montant,
        eventId,
        sessionId: session.id,
      }
    })

    return NextResponse.json({
      url: session.url,
      sessionId: session.id
    })

  } catch (err: any) {
    console.error('[create-express-checkout] Error:', err)
    return NextResponse.json({
      error: 'Erreur serveur',
      ...(process.env.NODE_ENV === 'development' && { details: err.message }),
    }, { status: 500 })
  }
}