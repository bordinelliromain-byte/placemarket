'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'

// ── Design tokens — identiques au reste de Whatmarket ──────────────────
const T = {
  accent: '#0EA5E9',
  accentSoft: 'rgba(14,165,233,0.08)',
  success: '#16A34A',
  successSoft: '#F0FDF4',
  successBorder: '#BBF7D0',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  ink: '#12151A',
  body: '#5B6270',
  muted: '#9AA1AB',
  border: '#ECEDF0',
  sans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  radius: 24,
  radiusSm: 16,
  shadowCard: '0 4px 12px rgba(15,23,42,0.05)',
  shadowFab: '0 8px 20px rgba(14,165,233,0.28)',
}

// ── Icônes SVG — aucun emoji ─────────────────────────────────────────
function IconCheck({ color = T.success, size = 34 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}
function IconCheckSmall({ color = T.success, size = 13 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}
function IconMail({ color = T.accent, size = 16 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
}
function IconMegaphone({ color = T.success, size = 15 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-7v16l-18-7z"/><path d="M11 12v6a2 2 0 0 0 4 0v-4"/></svg>
}
function IconWhatsapp({ size = 15 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="white"><path d="M17.6 6.3A8.9 8.9 0 0 0 12 4a8.8 8.8 0 0 0-7.6 13.3L4 20l2.8-.7A8.8 8.8 0 0 0 12 20.4a8.8 8.8 0 0 0 8.8-8.8 8.7 8.7 0 0 0-3.2-6.6zM12 18.8a7.2 7.2 0 0 1-3.7-1l-.3-.2-2.7.7.7-2.6-.2-.3A7.3 7.3 0 1 1 19.3 12 7.3 7.3 0 0 1 12 18.8zm4-5.4c-.2-.1-1.3-.6-1.5-.7s-.4-.1-.5.1-.6.7-.7.9-.3.2-.5.1a6 6 0 0 1-1.7-1 6.6 6.6 0 0 1-1.2-1.5c-.1-.2 0-.3.1-.5l.3-.4c.1-.1.1-.2.2-.4a.4.4 0 0 0 0-.4c0-.1-.5-1.2-.7-1.7s-.4-.4-.5-.4h-.4a.9.9 0 0 0-.6.3 2.6 2.6 0 0 0-.8 2 4.6 4.6 0 0 0 1 2.4 10.2 10.2 0 0 0 4 3.5c.5.2 1 .4 1.3.5a3.2 3.2 0 0 0 1.5.1 2.5 2.5 0 0 0 1.6-1.1 2 2 0 0 0 .1-1.1c0-.1-.2-.2-.4-.3z"/></svg>
}
function IconInstagram({ size = 15 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.4a4 4 0 1 1-4.5-3.9 4 4 0 0 1 4.5 3.9z"/><line x1="17.5" y1="6.5" x2="17.5" y2="6.5"/></svg>
}

function BoostSuccessContent() {
  const searchParams = useSearchParams()
  const nom = searchParams.get('nom') || 'votre commerce'
  const event = searchParams.get('event') || 'le marché'
  const eventId = searchParams.get('eventId') || ''
  const offre = searchParams.get('offre') || 'Boost Whatmarket'
  const amount = parseInt(searchParams.get('amount') || '20', 10)
  const sessionId = searchParams.get('session_id')
  const [emailSent, setEmailSent] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!sessionId || emailSent) return

    const sendEmail = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user?.email) {
          console.error('[boost-success] Pas d\'email utilisateur trouvé')
          return
        }

        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'boost_confirmation',
            to: user.email,
            data: {
              nom: nom || user.user_metadata?.full_name || 'Forain',
              offre,
              eventTitle: event,
              eventId,
              amount,
              stripeSessionId: sessionId,
            }
          })
        })

        if (res.ok) {
          setEmailSent(true)
        } else {
          console.error('[boost-success] Erreur envoi email:', await res.text())
        }
      } catch (err) {
        console.error('[boost-success] Email error:', err)
      }
    }
    sendEmail()
  }, [sessionId, emailSent, nom, event, eventId, offre, amount, supabase])

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: T.sans }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>

        {/* Icône succès */}
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', damping: 20 }}
          style={{ width: 76, height: 76, background: T.successSoft, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', border: `2px solid ${T.successBorder}` }}>
          <IconCheck />
        </motion.div>

        {/* Titre */}
        <p style={{ fontFamily: T.sans, fontSize: 25, fontWeight: 800, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 10 }}>
          Vous êtes en tête d'affiche !
        </p>
        <p style={{ fontFamily: T.sans, fontSize: 14.5, fontWeight: 400, color: T.body, lineHeight: 1.7, marginBottom: 26 }}>
          Votre pub pour <strong style={{ color: T.ink, fontWeight: 700 }}>{nom}</strong> est maintenant visible dans Whatmarket pour <strong style={{ color: T.ink, fontWeight: 700 }}>{event}</strong>.
        </p>

        {/* Récap */}
        <div style={{ background: T.card, borderRadius: T.radius, padding: '20px 22px', boxShadow: T.shadowCard, marginBottom: 20, textAlign: 'left' }}>
          <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Récapitulatif</p>
          {[
            ['Commerce', nom],
            ['Marché', event],
            ['Type', 'Publication sponsorisée'],
            ['Montant payé', `${amount.toFixed(2)} €`],
          ].map(([label, value], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: T.sans, fontSize: 13, paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${T.border}` }}>
              <span style={{ color: T.muted, fontWeight: 400 }}>{label}</span>
              <span style={{ fontWeight: 700, color: T.ink }}>{value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: T.sans, fontSize: 13 }}>
            <span style={{ color: T.muted, fontWeight: 400 }}>Statut</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, color: T.success }}>
              <IconCheckSmall /> Confirmé
            </span>
          </div>
        </div>

        {/* Info email */}
        <div style={{ background: T.accentSoft, borderRadius: T.radiusSm, padding: '13px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 11 }}>
          <IconMail />
          <p style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 400, color: T.body, textAlign: 'left', lineHeight: 1.5 }}>Un email de confirmation avec votre facture a été envoyé à votre adresse.</p>
        </div>

        {/* Partage */}
        <div style={{ background: T.successSoft, border: `1px solid ${T.successBorder}`, borderRadius: T.radiusSm, padding: '16px 18px', marginBottom: 22 }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: T.sans, fontSize: 13.5, fontWeight: 700, color: '#065F46', marginBottom: 4 }}>
            <IconMegaphone /> Partagez sur vos réseaux
          </p>
          <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 400, color: '#15803D', marginBottom: 13, lineHeight: 1.5 }}>Montrez à vos clients que vous êtes présents aujourd'hui</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Je suis en tête d'affiche au ${event} aujourd'hui ! Venez me retrouver`)}`}
              target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, background: '#25D366', color: 'white', textDecoration: 'none', borderRadius: 100, padding: '11px', fontFamily: T.sans, fontSize: 12.5, fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <IconWhatsapp /> WhatsApp
            </a>
            <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, background: 'linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)', color: 'white', textDecoration: 'none', borderRadius: 100, padding: '11px', fontFamily: T.sans, fontSize: 12.5, fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <IconInstagram /> Instagram
            </a>
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/whatmarket" style={{ flex: 1, background: T.accent, color: 'white', textDecoration: 'none', borderRadius: 100, padding: '15px', fontFamily: T.sans, fontSize: 14, fontWeight: 700, textAlign: 'center', display: 'block', boxShadow: T.shadowFab }}>
            Voir sur Whatmarket
          </a>
          <a href="/pro/ads/new" style={{ flex: 1, background: T.card, color: T.ink, border: `1px solid ${T.border}`, textDecoration: 'none', borderRadius: 100, padding: '15px', fontFamily: T.sans, fontSize: 14, fontWeight: 600, textAlign: 'center', display: 'block' }}>
            Nouvelle pub
          </a>
        </div>
      </motion.div>
    </div>
  )
}

export default function BoostSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <BoostSuccessContent />
    </Suspense>
  )
}