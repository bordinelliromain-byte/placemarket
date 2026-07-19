'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, Mail, Star, Megaphone, MessageCircle, Share2 } from 'lucide-react'

const BRAND = '#4F46E5'

function BoostExposantSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const nom = searchParams.get('nom') || 'votre stand'
  const event = searchParams.get('event') || 'le marché'

  const shareText = `Je suis à ne pas manquer au ${event} ! Venez me retrouver`

  return (
    <div style={{ minHeight: '100vh', background: '#EEF2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: 460, width: '100%', textAlign: 'center' }}>

        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', damping: 20 }}
          style={{ width: 80, height: 80, background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '2px solid #FDE68A', boxShadow: '0 4px 24px rgba(251,191,36,0.2)' }}>
          <Star size={36} style={{ color: '#FBBF24', fill: '#FBBF24' }} />
        </motion.div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', lineHeight: 1.2, marginBottom: 10, letterSpacing: '-0.02em' }}>
          Vous êtes à ne pas manquer !
        </h1>
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, marginBottom: 28 }}>
          Votre stand <strong style={{ color: '#0F172A' }}>{nom}</strong> est maintenant mis en avant dans Whatmarket pour <strong style={{ color: '#0F172A' }}>{event}</strong>.
        </p>

        {/* Récap */}
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 14, padding: '18px 22px', marginBottom: 16, textAlign: 'left' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Récapitulatif</p>
          {[
            ['Stand', nom],
            ['Marché', event],
            ['Position', 'À ne pas manquer'],
            ['Montant payé', '15,00 €'],
          ].map(([label, value], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ color: '#94A3B8' }}>{label}</span>
              <span style={{ fontWeight: 600, color: '#0F172A', textAlign: 'right' }}>{value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: '#94A3B8' }}>Statut</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#16A34A', fontWeight: 700 }}>
              <CheckCircle size={12} /> Confirmé
            </span>
          </div>
        </div>

        {/* Info email */}
        <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Mail size={15} style={{ color: BRAND, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: '#4338CA', textAlign: 'left' }}>Un email de confirmation avec votre facture a été envoyé.</p>
        </div>

        {/* Partage */}
        <div style={{ background: 'white', border: '1px solid #BBF7D0', borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#15803D', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Megaphone size={14} /> Dites-le à vos clients !
          </p>
          <p style={{ fontSize: 12, color: '#16A34A', marginBottom: 12 }}>Partagez que vous êtes la vedette de ce marché</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, background: '#25D366', color: 'white', textDecoration: 'none', borderRadius: 10, padding: '10px', fontSize: 12, fontWeight: 700, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <MessageCircle size={12} /> WhatsApp
            </a>
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/whatmarket" style={{ flex: 1, background: '#0F172A', color: 'white', textDecoration: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, textAlign: 'center', display: 'block' }}>
            Voir sur Whatmarket
          </a>
          <a href="/dashboard" style={{ flex: 1, background: 'white', color: '#0F172A', border: '1px solid #E2E8F0', textDecoration: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 600, textAlign: 'center', display: 'block' }}>
            Mon dashboard
          </a>
        </div>
      </motion.div>
    </div>
  )
}

export default function DashboardBoostSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#EEF2F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: `2px solid ${BRAND}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <BoostExposantSuccessContent />
    </Suspense>
  )
}