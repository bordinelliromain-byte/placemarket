// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const res = NextResponse.redirect(`${origin}${next}`)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookies) => cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
        },
      }
    )

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && sessionData?.user) {
      const user = sessionData.user

      // ─── Récupérer le profil pour avoir le rôle + nom ───
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, organisation_name, mairie_id, email')
        .eq('id', user.id)
        .single()

      // ─── Envoyer email de bienvenue selon le rôle ───
      // Seulement à la PREMIÈRE confirmation (on check si email_confirmed_at vient juste d'être set)
      const justConfirmed = user.email_confirmed_at
        ? Date.now() - new Date(user.email_confirmed_at).getTime() < 60_000  // dans la dernière minute
        : false

      if (justConfirmed && profile) {
        try {
          const fullName = profile.full_name || user.user_metadata?.full_name || 'Cher utilisateur'
          const userEmail = profile.email || user.email || ''

          if (profile.role === 'exposant') {
            // ─── BIENVENUE EXPOSANT ───
            await fetch(`${origin}/api/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'bienvenue',
                to: userEmail,
                data: { nom: fullName }
              })
            }).catch(err => console.error('Email bienvenue error:', err))

          } else if (profile.role === 'organisateur') {
            // ─── PAS d'email ici : la mairie est encore "pending" à ce stade
            // (confirmation d'adresse email uniquement, pas validation métier).
            // L'email "mairie_validee" part depuis /api/admin/approve-mairie
            // au moment de la vraie validation manuelle par l'admin. ───

          } else if (profile.role === 'placier') {
            // ─── BIENVENUE PLACIER (avec nom de la mairie) ───
            let mairieNom = 'votre mairie'
            if (profile.mairie_id) {
              const { data: mairie } = await supabase
                .from('profiles')
                .select('organisation_name, full_name')
                .eq('id', profile.mairie_id)
                .single()
              mairieNom = mairie?.organisation_name || mairie?.full_name || 'votre mairie'
            }

            await fetch(`${origin}/api/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'bienvenue_placier',
                to: userEmail,
                data: {
                  nom: fullName,
                  mairieNom: mairieNom
                }
              })
            }).catch(err => console.error('Email bienvenue_placier error:', err))
          }
        } catch (emailErr) {
          console.error('[callback] Email send failed:', emailErr)
          // Ne JAMAIS bloquer la redirection à cause d'un email
        }
      }

      // ✅ Redirige vers la page auth correspondant au rôle du compte
      const redirectPath = profile?.role === 'organisateur'
        ? '/auth/mairie?confirmed=true'
        : profile?.role === 'placier'
          ? '/auth/placier?confirmed=true'
          : '/auth?confirmed=true'

      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=confirmation_failed`)
}