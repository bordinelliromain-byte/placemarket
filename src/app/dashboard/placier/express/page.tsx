'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  QrCode, Plus, Loader, X, CheckCircle, AlertTriangle,
  User, Mail, Hash, Euro, Calendar, Info, Copy, Share2
} from 'lucide-react'

const BRAND = '#4F46E5'

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', bottom: 100, left: 20, right: 20, zIndex: 200, background: '#1E293B', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderLeft: `3px solid ${type === 'success' ? '#22C55E' : '#DC2626'}` }}>
      {type === 'success' ? <CheckCircle size={15} style={{ color: '#22C55E' }} /> : <AlertTriangle size={15} style={{ color: '#DC2626' }} />}
      <span style={{ fontSize: 13, fontWeight: 500, color: 'white' }}>{message}</span>
    </motion.div>
  )
}

export default function PlacierExpress() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [todayEvent, setTodayEvent] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Form
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [siren, setSiren] = useState('')
  const [montant, setMontant] = useState('')
  const [generating, setGenerating] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [paymentUrl, setPaymentUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/placier'); return }
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profileData?.role !== 'placier' && profileData?.role !== 'organisateur') {
        router.push('/dashboard'); return
      }
      setProfile(profileData)

      // Détecter event du jour
      const today = new Date().toISOString().split('T')[0]
      const todayStart = today + 'T00:00:00'
      const todayEnd = today + 'T23:59:59'

      let event: any = null

      const { data: planning } = await supabase
        .from('placier_planning')
        .select('event:event_id(*)')
        .eq('placier_id', user.id)

      if (planning && planning.length > 0) {
        const todayEvents = planning
          .map((p: any) => p.event)
          .filter((e: any) => e && e.start_date >= todayStart && e.start_date <= todayEnd)
        if (todayEvents.length > 0) event = todayEvents[0]
      }

      if (!event && profileData.mairie_id) {
        const { data: fallback } = await supabase
          .from('events').select('*')
          .eq('organisateur_id', profileData.mairie_id)
          .gte('start_date', todayStart)
          .lte('start_date', todayEnd)
          .limit(1).maybeSingle()
        event = fallback
      }

      setTodayEvent(event)
      // Pré-remplir le montant depuis le prix de l'event
      if (event?.price_per_spot) setMontant(String(event.price_per_spot))

      setLoading(false)
    }
    getData()
  }, [])

  const handleGenerate = async () => {
    setError(null)
    if (!nom || !email || !montant) {
      setError('Champs obligatoires manquants')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Email invalide')
      return
    }

    if (parseFloat(montant) <= 0) {
      setError('Montant invalide')
      return
    }

    setGenerating(true)
    setQrUrl('')
    setPaymentUrl('')

    try {
      const supabase = createClient()
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  setError('Session expirée, reconnecte-toi')
  setGenerating(false)
  return
}

const res = await fetch('/api/create-express-checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({
    nom,
    email,
    siren,
    montant,
    eventTitle: todayEvent?.title || '',
    eventId: todayEvent?.id || '',
  }),
})
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (!data.url) throw new Error('Pas de lien de paiement retourné')

      setPaymentUrl(data.url)

      // Générer QR (taille adaptée mobile)
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.url)}&bgcolor=1E293B&color=ffffff&margin=10`
      setQrUrl(qrApiUrl)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la génération')
    }
    setGenerating(false)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentUrl)
      setToast({ message: 'Lien de paiement copié', type: 'success' })
    } catch {
      setToast({ message: 'Erreur copie', type: 'error' })
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Paiement ${todayEvent?.title || 'Marché'}`,
          text: `${nom}, paiement de ${montant} €`,
          url: paymentUrl,
        })
      } catch {}
    } else {
      handleCopyLink()
    }
  }

  const reset = () => {
    setNom('')
    setEmail('')
    setSiren('')
    setMontant(todayEvent?.price_per_spot ? String(todayEvent.price_per_spot) : '')
    setQrUrl('')
    setPaymentUrl('')
    setError(null)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: `2px solid ${BRAND}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 480, margin: '0 auto', color: 'white' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <AnimatePresence>{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}</AnimatePresence>

      {/* HEADER */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} style={{ color: BRAND }} />
          <p style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>Ajout express</p>
        </div>
        <p style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
          Forain de dernière minute · {todayEvent?.title || 'Aucun marché aujourd\'hui'}
        </p>
      </div>

      <div style={{ padding: '16px 16px 110px' }}>
        <AnimatePresence mode="wait">

          {/* ── QR GÉNÉRÉ ── */}
          {qrUrl ? (
            <motion.div key="qr" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div style={{ background: '#1E293B', border: `1.5px solid ${BRAND}66`, borderRadius: 16, padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.15)', color: '#22C55E', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 100, marginBottom: 14, letterSpacing: '0.05em' }}>
                  <CheckCircle size={10} /> QR PRÊT
                </div>

                <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 4 }}>Montrez ce QR au forain</p>
                <p style={{ fontSize: 12, color: '#64748B', marginBottom: 20 }}>
                  <strong style={{ color: 'white' }}>{nom}</strong> scanne, paie et reçoit sa facture
                </p>

                {/* QR Code */}
                <div style={{ background: 'white', borderRadius: 16, padding: 12, display: 'inline-block', marginBottom: 16 }}>
                  <img src={qrUrl} alt="QR Code paiement" style={{ width: 240, height: 240, display: 'block' }} />
                </div>

                {/* Détails */}
                <div style={{ background: '#0F172A', borderRadius: 10, padding: '12px 14px', marginBottom: 14, textAlign: 'left' }}>
                  {[
                    { icon: <User size={11} />, label: 'Forain', value: nom },
                    { icon: <Mail size={11} />, label: 'Email', value: email },
                    { icon: <Euro size={11} />, label: 'Montant', value: `${montant} €` },
                    { icon: <Calendar size={11} />, label: 'Marché', value: todayEvent?.title || '—' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '6px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#64748B' }}>{item.icon} {item.label}</span>
                      <span style={{ color: 'white', fontWeight: 600, textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '8px 10px', textAlign: 'left', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <Info size={11} style={{ color: '#22C55E', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 10, color: '#86EFAC', lineHeight: 1.5 }}>
                    Facture envoyée auto à <strong>{email}</strong> après paiement
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleShare}
                  style={{ flex: 1, background: BRAND, color: 'white', border: 'none', borderRadius: 12, padding: '13px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Share2 size={14} /> Partager
                </button>
                <button onClick={handleCopyLink}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '13px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Copy size={14} /> Copier
                </button>
              </div>

              <button onClick={reset}
                style={{ background: 'transparent', color: '#64748B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <X size={13} /> Nouveau forain
              </button>
            </motion.div>
          ) : (
            // ── FORMULAIRE ──
            <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {!todayEvent && (
                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <AlertTriangle size={13} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 11, color: '#FCD34D', lineHeight: 1.5 }}>
                    Aucun marché aujourd'hui. L'ajout express ne sera pas relié à un événement.
                  </p>
                </div>
              )}

              <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '18px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(79,70,229,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={16} style={{ color: BRAND }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Nouveau forain</p>
                    <p style={{ fontSize: 10, color: '#64748B' }}>Génère un QR de paiement Stripe</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Nom complet', value: nom, setter: setNom, placeholder: 'Marie Dupont', type: 'text', icon: <User size={11} />, required: true },
                    { label: 'Email (facture)', value: email, setter: setEmail, placeholder: 'marie@email.fr', type: 'email', icon: <Mail size={11} />, required: true },
                    { label: 'SIREN', value: siren, setter: setSiren, placeholder: '123 456 789', type: 'text', icon: <Hash size={11} />, required: false },
                    { label: 'Montant (€)', value: montant, setter: setMontant, placeholder: '45', type: 'number', icon: <Euro size={11} />, required: true },
                  ].map((field, i) => (
                    <div key={i}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {field.icon} {field.label} {field.required && <span style={{ color: '#DC2626' }}>*</span>}
                      </label>
                      <input
                        type={field.type}
                        value={field.value}
                        onChange={e => { field.setter(e.target.value); setError(null) }}
                        placeholder={field.placeholder}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: '#0F172A',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 10,
                          fontSize: 14,
                          color: 'white',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                        onFocus={e => e.target.style.borderColor = BRAND}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <AlertTriangle size={13} style={{ color: '#DC2626' }} />
                  <p style={{ fontSize: 12, color: '#FCA5A5', fontWeight: 500 }}>{error}</p>
                </div>
              )}

              <button onClick={handleGenerate} disabled={!nom || !email || !montant || generating}
                style={{
                  width: '100%',
                  background: (!nom || !email || !montant) ? '#1E293B' : `linear-gradient(135deg, ${BRAND}, #7C3AED)`,
                  color: (!nom || !email || !montant) ? '#475569' : 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '16px',
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: (!nom || !email || !montant) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  boxShadow: (!nom || !email || !montant) ? 'none' : `0 6px 20px ${BRAND}55`,
                }}>
                {generating ? <Loader size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : <QrCode size={18} />}
                {generating ? 'Génération...' : 'Générer le QR'}
              </button>

              <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Info size={13} style={{ color: '#64748B', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 11, color: '#64748B', lineHeight: 1.6 }}>
                  Le forain scanne le QR → paie via Stripe → reçoit sa facture automatiquement
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}