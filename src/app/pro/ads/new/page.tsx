'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

type Step = 1 | 2 | 3 | 4

type AdData = {
  photo: File | null
  photoPreview: string
  photoUrl: string
  nom: string
  offre: string
  detail: string
  adresse: string
  eventId: string
  eventTitle: string
}

type EventWithSlots = {
  id: string
  title: string
  start_date: string
  location_name: string
  slots_taken: number
  is_full: boolean
}

// ── Design tokens — identiques au reste de Whatmarket ──────────────────
const T = {
  accent: '#0EA5E9',
  accentSoft: 'rgba(14,165,233,0.08)',
  accentBorder: 'rgba(14,165,233,0.25)',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  ink: '#12151A',
  body: '#5B6270',
  muted: '#9AA1AB',
  border: '#ECEDF0',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  sans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  radius: 24,
  radiusSm: 16,
  shadowCard: '0 4px 12px rgba(15,23,42,0.05)',
  shadowFab: '0 8px 20px rgba(14,165,233,0.28)',
}

const inputStyle = (focused?: boolean): React.CSSProperties => ({
  width: '100%', padding: '13px 15px', border: `1px solid ${focused ? T.accent : T.border}`,
  borderRadius: 14, fontSize: 14.5, color: T.ink, outline: 'none', boxSizing: 'border-box',
  fontFamily: T.sans, background: focused ? T.card : T.bg, transition: 'all 0.2s',
})

function StepBar({ current }: { current: Step }) {
  const steps = ['Photo', 'Texte', 'Marché', 'Paiement']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
      {steps.map((label, i) => {
        const n = (i + 1) as Step
        const done = current > n
        const active = current === n
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#16A34A' : active ? T.accent : T.border, transition: 'all 0.3s', boxShadow: active ? T.shadowFab : 'none' }}>
                {done
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, color: active ? 'white' : T.muted }}>{n}</span>
                }
              </div>
              <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: active ? 600 : 400, color: active ? T.ink : T.muted, whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {i < 3 && <div style={{ flex: 1, height: 2, background: done ? '#16A34A' : T.border, margin: '0 4px 14px', transition: 'background 0.3s', borderRadius: 2 }} />}
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// STEP 1 — Photo
// ═══════════════════════════════════════════════════════════════════════
function Step1({ data, onChange, onNext }: { data: AdData; onChange: (d: Partial<AdData>) => void; onNext: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const handleFile = (file: File) => { const url = URL.createObjectURL(file); onChange({ photo: file, photoPreview: url }) }
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <p style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: '-0.01em', marginBottom: 6 }}>Votre photo</p>
      <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 400, color: T.body, marginBottom: 22, lineHeight: 1.6 }}>Elle s'affichera dans l'app Whatmarket à la place des icônes. Choisissez une belle photo de votre stand ou produits.</p>
      <div onClick={() => inputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        style={{ border: `2px dashed ${data.photoPreview ? T.accent : T.border}`, borderRadius: T.radiusSm, overflow: 'hidden', cursor: 'pointer', background: data.photoPreview ? 'transparent' : T.bg, minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
        {data.photoPreview ? (
          <div style={{ position: 'relative', width: '100%' }}>
            <img src={data.photoPreview} alt="preview" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,12,16,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0' }}>
              <span style={{ fontFamily: T.sans, color: 'white', fontSize: 13, fontWeight: 600 }}>Changer la photo</span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ width: 54, height: 54, background: T.accentSoft, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Déposer une photo</p>
            <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 400, color: T.muted }}>ou cliquez pour parcourir · JPG, PNG · max 5MB</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      <button onClick={onNext} disabled={!data.photoPreview}
        style={{ width: '100%', background: data.photoPreview ? T.accent : T.border, color: data.photoPreview ? 'white' : T.muted, border: 'none', borderRadius: 100, padding: '16px', fontFamily: T.sans, fontSize: 15, fontWeight: 700, cursor: data.photoPreview ? 'pointer' : 'not-allowed', boxShadow: data.photoPreview ? T.shadowFab : 'none', transition: 'all 0.2s' }}>
        Continuer →
      </button>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// STEP 2 — Texte de la pub
// ═══════════════════════════════════════════════════════════════════════
function Step2({ data, onChange, onNext, onBack }: { data: AdData; onChange: (d: Partial<AdData>) => void; onNext: () => void; onBack: () => void }) {
  const valid = data.nom.trim() && data.offre.trim()
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <p style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: '-0.01em', marginBottom: 6 }}>Votre message</p>
      <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 400, color: T.body, marginBottom: 22, lineHeight: 1.6 }}>Ce texte apparaîtra sur votre pub dans Whatmarket.</p>

      {/* Aperçu live */}
      <div style={{ borderRadius: T.radiusSm, overflow: 'hidden', background: T.card, boxShadow: T.shadowCard, marginBottom: 22, display: 'flex', alignItems: 'stretch', minHeight: 84 }}>
        <div style={{ width: 84, flexShrink: 0, background: T.bg }}>
          {data.photoPreview
            ? <img src={data.photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: 84 }} />
            : <div style={{ width: '100%', height: '100%', minHeight: 84 }} />
          }
        </div>
        <div style={{ flex: 1, padding: '13px 15px' }}>
          <p style={{ fontFamily: T.sans, fontSize: 13.5, fontWeight: 700, color: T.ink, marginBottom: 3 }}>{data.nom || 'Votre commerce'}</p>
          <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 400, color: T.body, marginBottom: 3 }}>{data.offre || 'Votre offre'}</p>
          <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 400, color: T.muted, marginBottom: 4 }}>{data.detail || 'Détail optionnel'}</p>
          {data.adresse && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: T.accentSoft, borderRadius: 100, padding: '3px 9px' }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span style={{ fontFamily: T.sans, fontSize: 10, color: T.accent, fontWeight: 600 }}>{data.adresse}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Nom de votre commerce *', key: 'nom', placeholder: 'Ex: Rôtisserie Santini', maxLength: 40 },
          { label: 'Votre offre *', key: 'offre', placeholder: 'Ex: Demi-poulet + frites pour 2 — 18€', maxLength: 60 },
          { label: 'Détail (optionnel)', key: 'detail', placeholder: 'Ex: Valable ce samedi uniquement', maxLength: 80 },
          { label: 'Adresse (optionnel)', key: 'adresse', placeholder: 'Ex: 12 Rue de la Paix, Aubagne', maxLength: 100 },
        ].map(field => (
          <div key={field.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 500, color: T.body }}>{field.label}</label>
              <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 400, color: T.muted }}>{((data as any)[field.key] || '').length}/{field.maxLength}</span>
            </div>
            <input value={(data as any)[field.key]} onChange={e => onChange({ [field.key]: e.target.value.slice(0, field.maxLength) })} placeholder={field.placeholder}
              style={inputStyle()}
              onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.background = T.card }}
              onBlur={e => { e.target.style.borderColor = T.border; e.target.style.background = T.bg }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ flex: 1, background: T.card, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 100, padding: '15px', fontFamily: T.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← Retour</button>
        <button onClick={onNext} disabled={!valid} style={{ flex: 2, background: valid ? T.accent : T.border, color: valid ? 'white' : T.muted, border: 'none', borderRadius: 100, padding: '15px', fontFamily: T.sans, fontSize: 14, fontWeight: 700, cursor: valid ? 'pointer' : 'not-allowed', boxShadow: valid ? T.shadowFab : 'none', transition: 'all 0.2s' }}>Continuer →</button>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// STEP 3 — Choix du marché
// ═══════════════════════════════════════════════════════════════════════
function Step3({ data, onChange, onNext, onBack }: { data: AdData; onChange: (d: Partial<AdData>) => void; onNext: () => void; onBack: () => void }) {
  const [events, setEvents] = useState<EventWithSlots[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const load = async () => {
      try {
        const { createClient } = await import('@/lib/supabase')
        const supabase = createClient()
        const today = new Date().toISOString().split('T')[0]
        const { data: evs } = await supabase.from('events').select('id, title, start_date, location_name')
          .eq('status', 'published').gte('start_date', today).order('start_date', { ascending: true }).limit(10)
        if (!evs) { setLoading(false); return }
        const enriched = await Promise.all(evs.map(async ev => {
          const { count } = await supabase.from('boost_ads').select('*', { count: 'exact', head: true })
            .eq('event_id', ev.id).eq('status', 'active')
          return { ...ev, slots_taken: count || 0, is_full: (count || 0) >= 3 }
        }))
        setEvents(enriched)
      } catch (err) { console.error(err) }
      setLoading(false)
    }
    load()
  }, [])
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <p style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: '-0.01em', marginBottom: 6 }}>Choisir le marché</p>
      <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 400, color: T.body, marginBottom: 22, lineHeight: 1.6 }}>Votre pub sera visible par tous les visiteurs de ce marché dans Whatmarket.</p>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 76, borderRadius: T.radiusSm, background: T.border }} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
          {events.map(ev => {
            const isSelected = data.eventId === ev.id
            const isFull = ev.is_full
            return (
              <div key={ev.id} onClick={() => !isFull && onChange({ eventId: ev.id, eventTitle: ev.title })}
                style={{
                  borderRadius: T.radiusSm, padding: '15px 16px',
                  border: `1.5px solid ${isSelected ? T.accent : 'transparent'}`,
                  background: isSelected ? T.accentSoft : isFull ? T.bg : T.card,
                  boxShadow: isSelected || isFull ? 'none' : T.shadowCard,
                  cursor: isFull ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 13,
                  opacity: isFull ? 0.6 : 1, transition: 'all 0.2s',
                }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: isSelected ? T.accent : T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isSelected ? 'white' : T.muted} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <p style={{ fontFamily: T.sans, fontSize: 13.5, fontWeight: 700, color: isSelected ? T.accent : isFull ? T.muted : T.ink }}>{ev.title}</p>
                    {isFull && <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, color: T.danger, background: T.dangerSoft, padding: '2px 8px', borderRadius: 100 }}>COMPLET</span>}
                  </div>
                  <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 400, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {new Date(ev.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} · {ev.location_name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 16, height: 4, borderRadius: 2, background: i < ev.slots_taken ? T.danger : T.border }} />
                    ))}
                    <span style={{ fontFamily: T.sans, fontSize: 10.5, fontWeight: 400, color: T.muted, marginLeft: 3 }}>
                      {isFull ? 'Aucune place' : `${3 - ev.slots_taken} place${3 - ev.slots_taken > 1 ? 's' : ''} restante${3 - ev.slots_taken > 1 ? 's' : ''}`}
                    </span>
                  </div>
                </div>
                {isSelected && !isFull && (
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
              </div>
            )
          })}
          {events.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: T.sans, color: T.muted, fontSize: 13 }}>Aucun marché disponible</div>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ flex: 1, background: T.card, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 100, padding: '15px', fontFamily: T.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← Retour</button>
        <button onClick={onNext} disabled={!data.eventId} style={{ flex: 2, background: data.eventId ? T.accent : T.border, color: data.eventId ? 'white' : T.muted, border: 'none', borderRadius: 100, padding: '15px', fontFamily: T.sans, fontSize: 14, fontWeight: 700, cursor: data.eventId ? 'pointer' : 'not-allowed', boxShadow: data.eventId ? T.shadowFab : 'none', transition: 'all 0.2s' }}>Continuer →</button>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// STEP 4 — Paiement
// ═══════════════════════════════════════════════════════════════════════
function Step4({ data, onBack }: { data: AdData; onBack: () => void }) {
  const [paying, setPaying] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const uploadPhoto = async (): Promise<string> => {
    if (!data.photo) return ''
    setUploading(true)
    try {
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const ext = data.photo.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('boost-photos').upload(fileName, data.photo, { contentType: data.photo.type, upsert: false })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('boost-photos').getPublicUrl(fileName)
      return urlData.publicUrl
    } catch (err) { console.error('Upload error:', err); return '' }
    finally { setUploading(false) }
  }

  const handlePay = async () => {
    if (!email) return
    setPaying(true)
    setError('')
    try {
      const photoUrl = await uploadPhoto()
      const res = await fetch('/api/create-boost-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: data.nom, offre: data.offre, detail: data.detail, adresse: data.adresse, photoUrl, eventId: data.eventId, eventTitle: data.eventTitle, email })
      })
      const { url, error: stripeError } = await res.json()
      if (stripeError) throw new Error(stripeError)
      window.location.href = url
    } catch (err: any) { setError(err.message || 'Erreur lors du paiement'); setPaying(false) }
  }

  const guarantees = [
    { icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, text: 'Paiement sécurisé Stripe' },
    { icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, text: 'Publication immédiate' },
    { icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>, text: 'Confirmation par email' },
  ]

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <p style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: '-0.01em', marginBottom: 6 }}>Finaliser la publication</p>
      <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 400, color: T.body, marginBottom: 22, lineHeight: 1.6 }}>Votre pub sera visible dans Whatmarket dès validation du paiement.</p>

      <div style={{ borderRadius: T.radiusSm, overflow: 'hidden', background: T.card, boxShadow: T.shadowCard, display: 'flex', alignItems: 'stretch', marginBottom: 18, minHeight: 84 }}>
        <div style={{ width: 90, flexShrink: 0, background: T.bg }}>
          {data.photoPreview
            ? <img src={data.photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: 84 }} />
            : <div style={{ width: '100%', height: '100%', minHeight: 84 }} />
          }
        </div>
        <div style={{ flex: 1, padding: '15px 16px' }}>
          <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 4 }}>{data.nom}</p>
          <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 400, color: T.body, marginBottom: 4 }}>{data.offre}</p>
          {data.adresse && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: T.accentSoft, borderRadius: 100, padding: '3px 9px' }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span style={{ fontFamily: T.sans, fontSize: 10, color: T.accent, fontWeight: 600 }}>{data.adresse}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ background: T.accentSoft, borderRadius: T.radiusSm, padding: '15px 18px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.ink }}>Publication sponsorisée</p>
          <p style={{ fontFamily: T.sans, fontSize: 11.5, fontWeight: 400, color: T.body }}>Visible pendant toute la durée du marché</p>
        </div>
        <p style={{ fontFamily: T.sans, fontSize: 24, fontWeight: 800, color: T.accent }}>20€</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 500, color: T.body, display: 'block', marginBottom: 7 }}>Email de confirmation</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.fr"
          style={inputStyle()}
          onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.background = T.card }}
          onBlur={e => { e.target.style.borderColor = T.border; e.target.style.background = T.bg }} />
      </div>

      {error && <div style={{ background: T.dangerSoft, borderRadius: 12, padding: '11px 14px', marginBottom: 16, fontFamily: T.sans, fontSize: 12.5, fontWeight: 500, color: T.danger }}>{error}</div>}

      <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
        {guarantees.map((t, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 5 }}>{t.icon}</div>
            <span style={{ fontFamily: T.sans, fontSize: 10.5, fontWeight: 400, color: T.muted, lineHeight: 1.4 }}>{t.text}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ flex: 1, background: T.card, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 100, padding: '15px', fontFamily: T.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← Retour</button>
        <button onClick={handlePay} disabled={!email || paying || uploading}
          style={{ flex: 2, background: !email ? T.border : T.accent, color: !email ? T.muted : 'white', border: 'none', borderRadius: 100, padding: '15px', fontFamily: T.sans, fontSize: 14, fontWeight: 700, cursor: !email ? 'not-allowed' : 'pointer', boxShadow: !email ? 'none' : T.shadowFab, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}>
          {uploading
            ? <><div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Upload…</>
            : paying
            ? <><div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Redirection…</>
            : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Payer 20€ et publier</>
          }
        </button>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════
export default function BoostMyBusiness() {
  const [step, setStep] = useState<Step>(1)
  const [adData, setAdData] = useState<AdData>({ photo: null, photoPreview: '', photoUrl: '', nom: '', offre: '', detail: '', adresse: '', eventId: '', eventTitle: '' })
  const update = (d: Partial<AdData>) => setAdData(prev => ({ ...prev, ...d }))
  const router = useRouter()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: ${T.bg}; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.sans }}>

        {/* Header */}
        <div style={{ background: 'rgba(248,249,250,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${T.border}`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => router.push('/whatmarket')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.card, border: `1px solid ${T.border}`, borderRadius: 100, padding: '7px 13px', cursor: 'pointer', color: T.body, fontFamily: T.sans, fontSize: 12.5, fontWeight: 600 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Accueil
          </button>

          <div style={{ width: 1, height: 16, background: T.border }} />

          <a href="/whatmarket" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="26" height="26" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="20" fill={T.accent}/>
              <path d="M8 13L13 27L20 17L27 27L32 13" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 800, color: T.ink, letterSpacing: '-0.01em' }}>Whatmarket</span>
          </a>

          <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 400, color: T.muted }}>· Boost My Business</span>

          <div style={{ marginLeft: 'auto', background: T.accentSoft, color: T.accent, fontFamily: T.sans, fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 100, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill={T.accent}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Pro
          </div>
        </div>

        <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 20px 60px' }}>
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28, textAlign: 'center' }}>
              <p style={{ fontFamily: T.sans, fontSize: 26, fontWeight: 800, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 8 }}>Soyez en tête d'affiche</p>
              <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 400, color: T.body, lineHeight: 1.7 }}>Touchez les visiteurs du marché. Votre pub, leur téléphone, en temps réel.</p>
            </motion.div>
          )}
          <StepBar current={step} />
          <div style={{ background: T.card, borderRadius: T.radius, padding: '24px', boxShadow: T.shadowCard }}>
            <AnimatePresence mode="wait">
              {step === 1 && <Step1 key="1" data={adData} onChange={update} onNext={() => setStep(2)} />}
              {step === 2 && <Step2 key="2" data={adData} onChange={update} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
              {step === 3 && <Step3 key="3" data={adData} onChange={update} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
              {step === 4 && <Step4 key="4" data={adData} onBack={() => setStep(3)} />}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  )
}