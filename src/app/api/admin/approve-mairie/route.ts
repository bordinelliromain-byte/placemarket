// src/app/api/admin/approve-mairie/route.ts
// ═════════════════════════════════════════════════════════════
// PULSEMARKET — Approbation/refus d'une mairie en attente
// Passe organisateur_status + envoie l'email correspondant.
// ═════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/adminAuth'
import { validateBody } from '@/lib/validation'

const approveSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['approve', 'reject']).default('approve'),
})

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    const { supabase } = admin

    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.error('[admin/approve-mairie] NEXT_PUBLIC_APP_URL manquant')
      return NextResponse.json({ error: 'Configuration invalide' }, { status: 500 })
    }

    const result = await validateBody(req, approveSchema)
    if (result instanceof NextResponse) return result
    const { userId, action } = result

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, organisateur_status, organisation_name')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }
    if (profile.role !== 'organisateur') {
      return NextResponse.json({ error: 'Ce compte n\'est pas un compte organisateur' }, { status: 400 })
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ organisateur_status: newStatus })
      .eq('id', userId)

    if (updateError) {
      console.error('[admin/approve-mairie] Update error:', updateError)
      return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
    }

    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: action === 'approve' ? 'mairie_validee' : 'mairie_refusee',
          to: profile.email,
          data: {
            nom: profile.organisation_name || '',
            mairieNom: profile.organisation_name || '',
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/organisateur`,
          },
        }),
      })
    } catch (emailErr) {
      console.error('[admin/approve-mairie] Email send failed:', emailErr)
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      organisation: profile.organisation_name,
      email: profile.email,
    })

  } catch (err: any) {
    console.error('[admin/approve-mairie] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}