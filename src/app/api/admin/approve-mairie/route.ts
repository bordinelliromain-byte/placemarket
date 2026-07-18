// src/app/api/admin/approve-mairie/route.ts
// ═════════════════════════════════════════════════════════════
// PULSEMARKET — Approbation/refus d'une mairie en attente
// Passe organisateur_status + confirme l'email automatiquement
// (évite le piège : mairie approuvée mais bloquée à la connexion
// car elle n'a jamais cliqué son lien de confirmation) + envoie
// l'email correspondant.
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
      .select('id, email, role, organisateur_status, organisation_name, full_name')
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

    // ─── ✅ Confirme automatiquement l'email si on approuve ───
    // Évite le piège : mairie validée métier mais bloquée à la connexion
    // car elle n'a jamais cliqué son lien de confirmation d'email.
    if (action === 'approve') {
      const { error: confirmError } = await supabase.auth.admin.updateUserById(userId, {
        email_confirm: true,
      })
      if (confirmError) {
        // On ne bloque pas l'approbation pour ça, mais on le log —
        // si ça échoue, la mairie restera bloquée à la connexion tant
        // qu'elle n'aura pas cliqué son lien elle-même.
        console.error('[admin/approve-mairie] Email auto-confirm failed:', confirmError)
      }
    }

    const displayName = profile.organisation_name || profile.full_name || ''

    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: action === 'approve' ? 'mairie_validee' : 'mairie_refusee',
          to: profile.email,
          data: {
            nom: displayName,
            mairieNom: displayName,
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
      organisation: displayName,
      email: profile.email,
    })

  } catch (err: any) {
    console.error('[admin/approve-mairie] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}