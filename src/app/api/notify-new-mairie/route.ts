// src/app/api/notify-new-mairie/route.ts
// ═════════════════════════════════════════════════════════════
// PULSEMARKET — API Notify New Mairie
// Prévient l'admin (romain@pulse-market.fr) qu'une nouvelle mairie
// s'est inscrite et attend validation manuelle du dossier.
// ═════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { validateBody, checkRateLimit } from '@/lib/validation'

const resend = new Resend(process.env.RESEND_API_KEY)

// ─── Adresse admin qui reçoit l'alerte ───
const ADMIN_EMAIL = 'romain@pulse-market.fr'

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const notifySchema = z.object({
  orgName: z.string().trim().min(1).max(200),
  orgType: z.string().trim().max(50),
  siret: z.string().trim().max(20),
  email: z.string().email().max(254),
  justificatifName: z.string().trim().max(200).optional(),
  userId: z.string().uuid(),
})

const ORG_TYPE_LABELS: Record<string, string> = {
  mairie: 'Commune / Mairie',
  comite: 'Comité des fêtes',
  association: 'Association',
  autre: 'Autre organisateur',
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit léger — cet endpoint n'est appelé qu'après une vraie inscription
    const limited = checkRateLimit(req, {
      max: 10,
      windowMs: 5 * 60_000,
      keyPrefix: 'notify-new-mairie',
    })
    if (limited) return limited

    const result = await validateBody(req, notifySchema)
    if (result instanceof NextResponse) return result
    const { orgName, orgType, siret, email, justificatifName, userId } = result

    if (!process.env.RESEND_API_KEY) {
      console.error('[notify-new-mairie] RESEND_API_KEY manquant')
      return NextResponse.json({ error: 'Configuration invalide' }, { status: 500 })
    }

    const safeOrgName = escapeHtml(orgName)
    const safeEmail = escapeHtml(email)
    const safeSiret = escapeHtml(siret)
    const safeJustificatif = escapeHtml(justificatifName || '—')
    const orgTypeLabel = ORG_TYPE_LABELS[orgType] || orgType

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #F8FAFC; margin: 0; padding: 20px; color: #0F172A;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(15,23,42,0.08);">
    <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 24px;">
      <p style="margin: 0; color: white; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.85;">Nouvelle inscription</p>
      <h1 style="margin: 6px 0 0; color: white; font-size: 20px; font-weight: 700;">${safeOrgName}</h1>
    </div>
    <div style="padding: 24px;">
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F1F5F9; font-size: 14px;">
        <span style="color: #64748B;">Type</span><span style="font-weight: 600;">${escapeHtml(orgTypeLabel)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F1F5F9; font-size: 14px;">
        <span style="color: #64748B;">SIRET</span><span style="font-weight: 600;">${safeSiret}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F1F5F9; font-size: 14px;">
        <span style="color: #64748B;">Email</span><span style="font-weight: 600;">${safeEmail}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
        <span style="color: #64748B;">Justificatif</span><span style="font-weight: 600;">${safeJustificatif}</span>
      </div>

      <div style="background: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 10px; padding: 14px; margin-top: 20px;">
        <p style="margin: 0; font-size: 12px; color: #4338CA; line-height: 1.6;">
          Rendez-vous sur votre back office PulseMarket pour examiner le justificatif et valider ou refuser ce compte.
        </p>
      </div>

      <p style="margin: 20px 0 0; font-size: 11px; color: #94A3B8;">ID compte (Supabase) : ${escapeHtml(userId)}</p>
    </div>
  </div>
</body>
</html>
    `.trim()

    const { error } = await resend.emails.send({
      from: 'PulseMarket <noreply@pulse-market.fr>',
      to: ADMIN_EMAIL,
      subject: `Nouvelle mairie à valider : ${orgName}`,
      html,
    })

    if (error) {
      console.error('[notify-new-mairie] Resend error:', error)
      return NextResponse.json({ error: 'Erreur envoi notification' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[notify-new-mairie] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}