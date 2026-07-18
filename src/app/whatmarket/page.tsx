'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'

type Market = {
  id: string; title: string; description: string | null; location_name: string
  start_date: string; cover_image: string | null; latitude: number | null; longitude: number | null
  total_spots: number; available_spots: number; exposants_count?: number; distance?: number; sponsored?: boolean
}
type GeoStatus = 'idle' | 'requesting' | 'ok' | 'denied'
type VedetteData = { nom: string; offre: string; stand: string } | null
type BonPlan = { nom: string; offre: string; detail: string; adresse: string; photo_url: string }

// ── Design tokens « Magazine » ────────────────────────────────────────
// Tout est inline : aucune dépendance à un fichier de thème externe.
const T = {
  accent: '#0EA5E9',
  accentSoft: 'rgba(14,165,233,0.08)',
  paper: '#F9F8F6',        // fond crème
  card: '#FFFFFF',
  ink: '#14161A',          // titres
  body: '#4B5563',         // texte courant
  muted: '#8E8B85',        // légendes
  rule: '#E6E2DA',         // liseré 1px
  ruleSoft: 'rgba(0,0,0,0.06)',
  serif: '"Playfair Display",Georgia,"Times New Roman",serif',
  sans: '"DM Sans",system-ui,-apple-system,sans-serif',
  lift: 'translateY(-5px)',
  shadowRest: '0 1px 2px rgba(0,0,0,0.04)',
  shadowLift: '0 20px 40px rgba(0,0,0,0.08)',
  // Rythme vertical généreux — le contenu respire
  gutter: 28,
  stack: 30,
}

// ── Icônes ────────────────────────────────────────────────────────────
function IconShop({ color = T.muted, size = 22 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}
function IconStar({ color = T.accent, size = 18 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  )
}
function IconPin({ color = 'white', size = 11 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  )
}
function IconSend({ color = 'white', size = 10 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11"/>
    </svg>
  )
}
function IconShare({ color = T.body, size = 11 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  )
}
function IconChevron({ color = 'white', size = 13 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  )
}

// ── Bandeau de section éditorial : filet + chapô + titre serif ────────
function SectionHead({ kicker, title, aside }: { kicker: string; title: string; aside?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ height: 1, background: T.rule, marginBottom: 14 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
        <div>
          <p style={{ fontFamily: T.sans, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.accent, marginBottom: 7 }}>{kicker}</p>
          <h3 style={{ fontFamily: T.serif, fontSize: 21, fontWeight: 700, color: T.ink, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{title}</h3>
        </div>
        {aside}
      </div>
    </div>
  )
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}
function fmt_dist(km: number) { return km < 1 ? `${Math.round(km*1000)} m` : `${km.toFixed(1)} km` }

function fmt_countdown(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff < 0) return { text: 'Terminé', color: 'rgba(255,255,255,0.6)', dot: false }
  const h = Math.floor(diff/3600000), d = Math.floor(h/24)
  if (d > 1) return { text: `Dans ${d} jours`, color: 'rgba(255,255,255,0.92)', dot: false }
  if (d === 1) return { text: 'Demain', color: '#FCD34D', dot: true }
  if (h > 0) return { text: `Ferme dans ${h}h`, color: '#FCA5A5', dot: true }
  return { text: 'En cours', color: '#6EE7B7', dot: true }
}

const COVERS = [
  'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=800&q=80',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
  'https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=800&q=80',
]

const NAV = [
  { label: 'Accueil', href: '/whatmarket', path: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10' },
  { label: 'Carte', href: '/whatmarket/carte', path: 'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16' },
  { label: 'Pro', href: '/pro/ads/new', path: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
]

const REGIONS = [
  { id: 'paca', label: 'Bouches-du-Rhône', dept: '13', cx: 372, cy: 368 },
  { id: 'occitanie', label: 'Occitanie', dept: '34', cx: 248, cy: 382 },
  { id: 'aura', label: 'Auvergne-Rhône-Alpes', dept: '69', cx: 332, cy: 295 },
  { id: 'naq', label: 'Nouvelle-Aquitaine', dept: '33', cx: 152, cy: 325 },
  { id: 'pdl', label: 'Pays de la Loire', dept: '44', cx: 148, cy: 210 },
  { id: 'idf', label: 'Île-de-France', dept: '75', cx: 272, cy: 148 },
  { id: 'hdf', label: 'Hauts-de-France', dept: '59', cx: 262, cy: 82 },
  { id: 'gest', label: 'Grand Est', dept: '67', cx: 352, cy: 142 },
  { id: 'bfc', label: 'Bourgogne', dept: '21', cx: 318, cy: 218 },
  { id: 'norm', label: 'Normandie', dept: '76', cx: 186, cy: 105 },
  { id: 'bzh', label: 'Bretagne', dept: '29', cx: 88, cy: 148 },
  { id: 'cvl', label: 'Centre-Val de Loire', dept: '45', cx: 228, cy: 200 },
]

// ── Encart éditorial « À ne pas manquer » ─────────────────────────────
function VedetteSlot({ marketId }: { marketId: string }) {
  const [vedette, setVedette] = useState<VedetteData>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const load = async () => {
      try {
        const { createClient } = await import('@/lib/supabase')
        const supabase = createClient()
        const { data } = await supabase.from('exposant_boosts').select('nom, offre, stand')
          .eq('event_id', marketId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).single()
        if (data) setVedette(data)
      } catch (err) {}
      setLoading(false)
    }
    load()
  }, [marketId])
  if (loading || !vedette) return null
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.2 }} style={{ marginBottom: T.stack }}>
      <SectionHead
        kicker="Le choix de la rédaction"
        title="À ne pas manquer"
        aside={<span style={{ fontFamily: T.sans, fontSize: 9, color: T.muted, letterSpacing: '0.16em', fontWeight: 500, textTransform: 'uppercase', flexShrink: 0 }}>Partenaire</span>}
      />
      <div style={{ border: `1px solid ${T.rule}`, borderRadius: 14, background: T.card, padding: '24px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
          <IconStar color={T.accent} size={14} />
          <p style={{ fontFamily: T.serif, fontSize: 19, fontWeight: 700, color: T.ink, letterSpacing: '-0.01em' }}>{vedette.nom}</p>
        </div>
        <p style={{ fontFamily: T.sans, fontSize: 13.5, color: T.body, lineHeight: 1.7, marginBottom: vedette.stand ? 16 : 0 }}>{vedette.offre}</p>
        {vedette.stand && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderTop: `1px solid ${T.rule}`, paddingTop: 14, width: '100%' }}>
            <IconPin color={T.accent} size={11} />
            <span style={{ fontFamily: T.sans, fontSize: 11.5, color: T.muted, fontWeight: 500, letterSpacing: '0.02em' }}>{vedette.stand}</span>
          </div>
        )}
      </div>
    </motion.section>
  )
}

// ── Encart éditorial « Expérience prolongée » ─────────────────────────
function DriveToStoreSlot({ marketId }: { marketId: string }) {
  const [bonsPlans, setBonsPlans] = useState<BonPlan[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const load = async () => {
      try {
        const { createClient } = await import('@/lib/supabase')
        const supabase = createClient()
        const { data } = await supabase.from('boost_ads')
          .select('nom, offre, detail, adresse, photo_url')
          .eq('event_id', marketId).eq('status', 'active')
          .order('created_at', { ascending: false }).limit(3)
        if (data && data.length > 0) {
          setBonsPlans(data.map((item: any) => ({
            nom: item.nom, offre: item.offre, detail: item.detail || '',
            adresse: item.adresse || '', photo_url: item.photo_url || '',
          })))
        }
      } catch (err) {}
      setLoading(false)
    }
    load()
  }, [marketId])

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'Bons plans du marché — Whatmarket', text: "Découvrez les bons plans des commerçants locaux au marché aujourd'hui !", url: window.location.href })
    } else { navigator.clipboard?.writeText(window.location.href) }
  }

  if (loading || bonsPlans.length === 0) return null
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.3 }} style={{ marginBottom: T.stack }}>
      <SectionHead
        kicker="Sponsorisé"
        title="Expérience prolongée"
        aside={
          <button onClick={handleShare}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${T.rule}`, borderRadius: 100, padding: '7px 14px', cursor: 'pointer', flexShrink: 0, transition: 'border-color 0.25s ease, color 0.25s ease' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.rule }}>
            <IconShare size={11} color={T.body} />
            <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, color: T.body }}>Partager</span>
          </button>
        }
      />
      {/* Liseré unique, séparateurs internes : lecture calme, façon encart presse */}
      <div style={{ border: `1px solid ${T.rule}`, borderRadius: 14, background: T.card, overflow: 'hidden' }}>
        {bonsPlans.map((plan, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: 0.35+i*0.08 }}
            style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 18, borderTop: i === 0 ? 'none' : `1px solid ${T.rule}` }}>
            {plan.photo_url
              ? <img src={plan.photo_url} alt={plan.nom} style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 56, height: 56, borderRadius: 10, border: `1px solid ${T.rule}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconShop color={T.muted} size={22} />
                </div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 4, letterSpacing: '-0.01em' }}>{plan.nom}</p>
              <p style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 500, color: T.accent, marginBottom: plan.detail ? 3 : 0 }}>{plan.offre}</p>
              {plan.detail && <p style={{ fontFamily: T.sans, fontSize: 11.5, color: T.muted, lineHeight: 1.5 }}>{plan.detail}</p>}
            </div>
            <a href={plan.adresse ? `https://www.google.com/maps/search/${encodeURIComponent(plan.adresse)}` : '#'}
              target="_blank" rel="noopener noreferrer"
              style={{ flexShrink: 0, border: `1px solid ${T.rule}`, borderRadius: 100, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', transition: 'border-color 0.25s ease, background 0.25s ease' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.background = T.accentSoft }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.rule; e.currentTarget.style.background = 'transparent' }}>
              <span style={{ fontFamily: T.sans, fontSize: 11.5, fontWeight: 600, color: T.accent }}>Voir</span>
              <IconChevron color={T.accent} size={10} />
            </a>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}

// ── Effet « lift » partagé par les cartes ─────────────────────────────
const liftIn = (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.transform = T.lift
  e.currentTarget.style.boxShadow = T.shadowLift
}
const liftOut = (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.transform = 'translateY(0)'
  e.currentTarget.style.boxShadow = T.shadowRest
}

function SponsoredMarketCard({ market, onClick }: { market: Market; onClick: () => void }) {
  const cd = fmt_countdown(market.start_date)
  const occupied = market.total_spots - market.available_spots
  const pct = market.total_spots > 0 ? (occupied / market.total_spots) * 100 : 0
  return (
    <motion.article initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22,1,0.36,1] }} onClick={onClick} style={{ cursor: 'pointer', marginBottom: 22 }}>
      <div
        style={{ borderRadius: 16, overflow: 'hidden', background: T.card, border: `1px solid ${T.accent}`, boxShadow: T.shadowRest, transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s cubic-bezier(0.22,1,0.36,1)' }}
        onMouseEnter={liftIn} onMouseLeave={liftOut}>
        <div style={{ position: 'relative', height: 236 }}>
          <img src={market.cover_image || COVERS[0]} alt={market.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.68) 0%,rgba(0,0,0,0.05) 58%,transparent 100%)' }} />
          <div style={{ position: 'absolute', top: 18, left: 18, right: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.accent, borderRadius: 100, padding: '6px 13px' }}>
              <IconStar color="white" size={9} />
              <span style={{ fontFamily: T.sans, color: 'white', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em' }}>SÉLECTION</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              {market.distance !== undefined && (
                <div style={{ background: 'rgba(15,15,15,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 100, padding: '5px 11px', display: 'flex', alignItems: 'center', gap: 5, border: '1px solid rgba(255,255,255,0.14)' }}>
                  <IconSend size={10} />
                  <span style={{ fontFamily: T.sans, color: 'white', fontSize: 11, fontWeight: 500 }}>{fmt_dist(market.distance)}</span>
                </div>
              )}
              <div style={{ background: 'rgba(15,15,15,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 100, padding: '5px 11px', display: 'flex', alignItems: 'center', gap: 5, border: '1px solid rgba(255,255,255,0.14)' }}>
                {cd.dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: cd.color, display: 'block' }} />}
                <span style={{ fontFamily: T.sans, color: cd.color, fontSize: 11, fontWeight: 500 }}>{cd.text}</span>
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 20, left: 22, right: 22 }}>
            <h2 style={{ fontFamily: T.serif, fontSize: 27, fontWeight: 700, color: 'white', lineHeight: 1.14, letterSpacing: '-0.015em', marginBottom: 7 }}>{market.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconPin color="rgba(255,255,255,0.72)" size={11} />
              <span style={{ fontFamily: T.sans, fontSize: 12, color: 'rgba(255,255,255,0.78)', letterSpacing: '0.01em' }}>{market.location_name}</span>
            </div>
          </div>
        </div>
        <div style={{ padding: '20px 22px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <p style={{ fontFamily: T.sans, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.muted, marginBottom: 4 }}>Date</p>
              <p style={{ fontFamily: T.sans, fontSize: 13, color: T.ink, fontWeight: 600 }}>{new Date(market.start_date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</p>
            </div>
            <div style={{ width: 1, background: T.rule }} />
            <div>
              <p style={{ fontFamily: T.sans, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.muted, marginBottom: 4 }}>Stands</p>
              <p style={{ fontFamily: T.sans, fontSize: 13, color: T.ink, fontWeight: 600 }}>{occupied}</p>
            </div>
          </div>
          <div style={{ width: 38, height: 38, background: T.accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconChevron color="white" size={14} />
          </div>
        </div>
        <div style={{ padding: '0 22px 14px' }}>
          <span style={{ fontFamily: T.sans, fontSize: 9, color: T.muted, letterSpacing: '0.16em', fontWeight: 500, textTransform: 'uppercase' }}>Sponsorisé</span>
        </div>
        <div style={{ height: 2, background: T.rule }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.4 }} style={{ height: '100%', background: T.accent }} />
        </div>
      </div>
    </motion.article>
  )
}

function MarketCard({ market, index, onClick }: { market: Market; index: number; onClick: () => void }) {
  const cd = fmt_countdown(market.start_date)
  const cover = market.cover_image || COVERS[index % COVERS.length]
  const occupied = market.total_spots - market.available_spots
  const pct = market.total_spots > 0 ? (occupied/market.total_spots)*100 : 0
  return (
    <motion.article initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: index*0.08, ease: [0.22,1,0.36,1] }} onClick={onClick} style={{ cursor: 'pointer', marginBottom: 22 }}>
      <div
        style={{ borderRadius: 16, overflow: 'hidden', background: T.card, border: `1px solid ${T.rule}`, boxShadow: T.shadowRest, transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s cubic-bezier(0.22,1,0.36,1)' }}
        onMouseEnter={liftIn} onMouseLeave={liftOut}>
        <div style={{ position: 'relative', height: 224, overflow: 'hidden' }}>
          <img src={cover} alt={market.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.66) 0%,rgba(0,0,0,0.06) 58%,transparent 100%)' }} />
          <div style={{ position: 'absolute', top: 18, left: 18, right: 18, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(15,15,15,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 100, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.14)' }}>
              {cd.dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: cd.color, display: 'block' }} />}
              <span style={{ fontFamily: T.sans, color: cd.color, fontSize: 11, fontWeight: 500 }}>{cd.text}</span>
            </div>
            {market.distance !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(15,15,15,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 100, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.14)' }}>
                <IconSend size={10} />
                <span style={{ fontFamily: T.sans, color: 'white', fontSize: 11, fontWeight: 500 }}>{fmt_dist(market.distance)}</span>
              </div>
            )}
          </div>
          <div style={{ position: 'absolute', bottom: 20, left: 22, right: 22 }}>
            <h2 style={{ fontFamily: T.serif, fontSize: 25, fontWeight: 700, color: 'white', lineHeight: 1.15, letterSpacing: '-0.015em', marginBottom: 7 }}>{market.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconPin color="rgba(255,255,255,0.72)" size={11} />
              <span style={{ fontFamily: T.sans, fontSize: 12, color: 'rgba(255,255,255,0.78)', letterSpacing: '0.01em' }}>{market.location_name}</span>
            </div>
          </div>
        </div>
        {/* Pied de carte : petites capitales + filet vertical, pas de pastilles */}
        <div style={{ padding: '20px 22px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <p style={{ fontFamily: T.sans, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.muted, marginBottom: 4 }}>Date</p>
              <p style={{ fontFamily: T.sans, fontSize: 13, color: T.ink, fontWeight: 600 }}>{new Date(market.start_date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</p>
            </div>
            <div style={{ width: 1, background: T.rule }} />
            <div>
              <p style={{ fontFamily: T.sans, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.muted, marginBottom: 4 }}>Stands</p>
              <p style={{ fontFamily: T.sans, fontSize: 13, color: T.ink, fontWeight: 600 }}>{occupied}</p>
            </div>
          </div>
          <div style={{ width: 38, height: 38, background: T.accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconChevron color="white" size={14} />
          </div>
        </div>
        <div style={{ height: 2, background: T.rule }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, delay: 0.3+index*0.07 }}
            style={{ height: '100%', background: pct>80 ? '#DC7B6B' : T.accent }} />
        </div>
      </div>
    </motion.article>
  )
}

function MarketDrawer({ market, onClose }: { market: Market; onClose: () => void }) {
  const cd = fmt_countdown(market.start_date)
  const cover = market.cover_image || COVERS[0]
  const occupied = market.total_spots - market.available_spots
  const mapsUrl = market.latitude && market.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${market.latitude},${market.longitude}`
    : `https://www.google.com/maps/search/${encodeURIComponent(market.location_name)}`
  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 200], [1, 0])
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(20,22,26,0.42)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <motion.div drag="y" dragConstraints={{ top: 0, bottom: 400 }} dragElastic={{ top: 0, bottom: 0.3 }}
        onDragEnd={(_, info) => { if (info.offset.y > 120) onClose() }}
        style={{ y, opacity, position: 'absolute', bottom: 0, left: 0, right: 0, background: T.paper, borderRadius: '24px 24px 0 0', maxHeight: '93vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '14px 0 10px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 38, height: 4, borderRadius: 100, background: '#D6D2C9' }} />
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: `14px ${T.gutter}px 64px` }}>
          <div style={{ height: 220, borderRadius: 14, overflow: 'hidden', marginBottom: 26, position: 'relative' }}>
            <img src={cover} alt={market.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.6) 0%,transparent 62%)' }} />
            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(15,15,15,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 100, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.14)' }}>
              {cd.dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: cd.color, display: 'block' }} />}
              <span style={{ fontFamily: T.sans, color: cd.color, fontSize: 11, fontWeight: 500 }}>{cd.text}</span>
            </div>
            {market.sponsored && (
              <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', alignItems: 'center', gap: 5, background: T.accent, borderRadius: 100, padding: '5px 12px' }}>
                <IconStar color="white" size={8} />
                <span style={{ fontFamily: T.sans, color: 'white', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em' }}>SÉLECTION</span>
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 20, left: 22, right: 22 }}>
              <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 700, color: 'white', lineHeight: 1.13, letterSpacing: '-0.015em' }}>{market.title}</h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 26, flexWrap: 'wrap' }}>
            <IconPin color={T.muted} size={13} />
            <span style={{ fontFamily: T.sans, fontSize: 13, color: T.body }}>{market.location_name}</span>
            {market.distance !== undefined && (
              <span style={{ fontFamily: T.sans, fontSize: 11.5, color: T.accent, fontWeight: 600, border: `1px solid ${T.rule}`, padding: '3px 10px', borderRadius: 100 }}>{fmt_dist(market.distance)}</span>
            )}
          </div>

          {/* Bandeau de faits : filets fins, aucun aplat */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', border: `1px solid ${T.rule}`, borderRadius: 14, background: T.card, marginBottom: T.stack, overflow: 'hidden' }}>
            {[
              { label: 'Date', value: new Date(market.start_date).toLocaleDateString('fr-FR',{day:'numeric',month:'long'}) },
              { label: 'Heure', value: new Date(market.start_date).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) },
              { label: 'Stands', value: `${occupied}/${market.total_spots}` },
            ].map((s,i) => (
              <div key={i} style={{ padding: '20px 12px', textAlign: 'center', borderLeft: i === 0 ? 'none' : `1px solid ${T.rule}` }}>
                <p style={{ fontFamily: T.sans, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>{s.label}</p>
                <p style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: T.ink }}>{s.value}</p>
              </div>
            ))}
          </div>

          <VedetteSlot marketId={market.id} />

          {market.description && (
            <div style={{ marginBottom: T.stack }}>
              {/* Lettrine + interlignage large : lecture « article » */}
              <p style={{ fontFamily: T.sans, fontSize: 14.5, color: T.body, lineHeight: 1.85, letterSpacing: '0.002em' }}>{market.description}</p>
            </div>
          )}

          <DriveToStoreSlot marketId={market.id} />

          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: T.accent, color: 'white', borderRadius: 14, padding: '22px', fontFamily: T.sans, fontSize: 13, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.14em', textTransform: 'uppercase', boxShadow: '0 8px 24px rgba(14,165,233,0.22)', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = T.lift; e.currentTarget.style.boxShadow = '0 20px 40px rgba(14,165,233,0.26)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(14,165,233,0.22)' }}>
            <IconSend size={16} />
            Y aller
          </a>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function WhatmarketHome() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [selected, setSelected] = useState<Market | null>(null)
  const [filter, setFilter] = useState<'bientot'|'proche'|'tous'>('bientot')
  const [sponsoredMarket, setSponsoredMarket] = useState<Market | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

  const loadMarkets = useCallback(async (lat?: number, lng?: number) => {
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      const { data: events } = await supabase.from('events').select('*').eq('status','published')
        .gte('start_date',today).order('start_date',{ascending:true}).limit(20)
      if (!events) { setLoading(false); return }
      const enriched = await Promise.all(events.map(async (ev: any) => {
        const { count } = await supabase.from('applications').select('*',{count:'exact',head:true}).eq('event_id',ev.id).in('status',['paid','present'])
        return { ...ev, exposants_count: count||0, distance: lat&&lng&&ev.latitude&&ev.longitude?haversine(lat,lng,ev.latitude,ev.longitude):undefined }
      }))
      setMarkets(enriched)
      try {
        const now = new Date().toISOString()
        const { data: boostData } = await supabase
          .from('mairie_boosts').select('event_id').eq('status', 'active').gt('expires_at', now)
          .order('created_at', { ascending: false }).limit(1).single()
        if (boostData?.event_id) {
          const boosted = enriched.find((m: any) => m.id === boostData.event_id)
          if (boosted) setSponsoredMarket({ ...boosted, sponsored: true })
        }
      } catch (err) {}
    } catch(err) { console.error(err) }
    setLoading(false)
  }, [])

  useEffect(() => { loadMarkets() }, [loadMarkets])

  const requestGeo = () => {
    if (!navigator.geolocation) { setGeoStatus('denied'); return }
    setGeoStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => { setGeoStatus('ok'); loadMarkets(lat,lng) },
      () => { setGeoStatus('denied') }, { timeout: 8000 }
    )
  }

  const regionLabel = selectedRegion ? REGIONS.find(r => r.id === selectedRegion)?.label : null
  const filteredByRegion = selectedRegion
    ? markets.filter(m => m.location_name?.toLowerCase().includes(regionLabel?.split(' ').pop()?.toLowerCase() || ''))
    : markets

  const sorted = [...filteredByRegion].sort((a,b) => {
    if (filter==='proche'&&a.distance!==undefined&&b.distance!==undefined) return a.distance-b.distance
    if (filter==='bientot') return new Date(a.start_date).getTime()-new Date(b.start_date).getTime()
    return 0
  })

  const chip = (active: boolean): React.CSSProperties => ({
    fontFamily: T.sans,
    padding: '9px 16px',
    borderRadius: 100,
    border: `1px solid ${active ? T.accent : T.rule}`,
    cursor: 'pointer',
    fontSize: 11.5,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    letterSpacing: '0.01em',
    background: active ? T.accent : T.card,
    color: active ? '#FFFFFF' : T.body,
    transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
  })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;0,900;1,400;1,700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        html,body{font-family:'DM Sans',system-ui,sans-serif;background:${T.paper};color:${T.body};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
        h1,h2,h3{font-family:'Playfair Display',Georgia,serif;font-weight:700;}
        ::-webkit-scrollbar{display:none;}*{scrollbar-width:none;}
        @keyframes shimmer{0%{background-position:-300px 0}100%{background-position:300px 0}}
        @keyframes pulse-ring{0%,100%{box-shadow:0 0 0 0 rgba(14,165,233,0.32)}50%{box-shadow:0 0 0 10px rgba(14,165,233,0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .pulse-ring{animation:pulse-ring 1.8s ease infinite}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important;}}
      `}</style>

      <div style={{ maxWidth: 448, margin: '0 auto', minHeight: '100vh', background: T.paper, position: 'relative', fontFamily: T.sans }}>

        {/* ── OURS / EN-TÊTE ────────────────────────────────────────── */}
        <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(249,248,246,0.92)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', padding: `56px ${T.gutter}px 20px`, borderBottom: `1px solid ${T.rule}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 8 }}>
                <svg width="30" height="30" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="20" fill={T.accent}/>
                  <path d="M8 13L13 27L20 17L27 27L32 13" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 900, color: T.ink, letterSpacing: '-0.02em' }}>What</span>
                  <span style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 400, fontStyle: 'italic', color: T.accent, letterSpacing: '-0.02em' }}>market</span>
                </div>
              </div>
              <p style={{ fontFamily: T.sans, fontSize: 10, color: T.muted, letterSpacing: '0.16em', textTransform: 'uppercase', marginLeft: 41 }}>
                {selectedRegion ? regionLabel : geoStatus==='ok' ? 'Marchés près de vous' : 'Les marchés locaux'}
              </p>
            </div>

            <button onClick={geoStatus==='idle'||geoStatus==='denied'?requestGeo:undefined}
              className={geoStatus==='requesting'?'pulse-ring':''}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
                background: geoStatus==='ok' ? T.card : T.accent,
                border: `1px solid ${geoStatus==='ok' ? T.rule : T.accent}`,
                borderRadius: 100, padding: '11px 17px',
                cursor: geoStatus==='requesting' ? 'default' : 'pointer',
                boxShadow: geoStatus==='ok' ? 'none' : '0 6px 18px rgba(14,165,233,0.22)',
                transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
              }}>
              {geoStatus==='requesting'
                ? <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : <IconSend color={geoStatus==='ok' ? T.accent : 'white'} size={12} />
              }
              <span style={{ fontFamily: T.sans, fontSize: 11.5, fontWeight: 600, color: geoStatus==='ok' ? T.accent : 'white', letterSpacing: '0.01em' }}>
                {geoStatus==='ok' ? 'Localisé' : geoStatus==='requesting' ? 'Recherche…' : 'Autour de moi'}
              </span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: 9, marginBottom: 12 }}>
            {(['bientot','proche','tous'] as const).map((f,i) => (
              <button key={f} onClick={() => setFilter(f)} style={chip(filter===f)}>
                {['Bientôt','Le plus proche','Tous'][i]}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 9, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}>
            <button onClick={() => setSelectedRegion(null)} style={chip(!selectedRegion)}>Toute la France</button>
            {REGIONS.map(r => (
              <button key={r.id} onClick={() => setSelectedRegion(selectedRegion === r.id ? null : r.id)}
                style={{ ...chip(selectedRegion === r.id), display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: selectedRegion === r.id ? 'rgba(255,255,255,0.85)' : T.accent, flexShrink: 0 }} />
                {r.label}
              </button>
            ))}
          </div>
        </header>

        {/* ── CORPS ─────────────────────────────────────────────────── */}
        <main style={{ padding: `${T.gutter}px ${T.gutter}px 120px` }}>

          <AnimatePresence>
            {geoStatus==='idle' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                style={{ border: `1px solid ${T.rule}`, background: T.card, borderRadius: 14, padding: '22px 24px', marginBottom: T.stack, display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ width: 42, height: 42, border: `1px solid ${T.rule}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconPin color={T.accent} size={17} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 4 }}>Marchés près de chez vous</p>
                  <p style={{ fontFamily: T.sans, fontSize: 11.5, color: T.muted, lineHeight: 1.55 }}>Activez la géolocalisation pour afficher les distances</p>
                </div>
                <button onClick={requestGeo}
                  style={{ background: T.accent, color: 'white', border: 'none', borderRadius: 100, padding: '10px 18px', fontFamily: T.sans, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0, letterSpacing: '0.02em', transition: 'transform 0.25s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}>
                  Activer
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {selectedRegion && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${T.rule}` }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, flexShrink: 0 }} />
              <span style={{ fontFamily: T.sans, fontSize: 11.5, color: T.muted, letterSpacing: '0.02em' }}>
                {sorted.length} marché{sorted.length > 1 ? 's' : ''} en {regionLabel}
              </span>
              <button onClick={() => setSelectedRegion(null)}
                style={{ marginLeft: 'auto', fontFamily: T.sans, fontSize: 11, color: T.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, letterSpacing: '0.02em' }}>
                Effacer
              </button>
            </div>
          )}

          {loading && [1,2,3].map(i => (
            <div key={i} style={{ height: 300, borderRadius: 16, marginBottom: 22, border: `1px solid ${T.rule}`, background: 'linear-gradient(90deg,#F3F1EC 0%,#E9E6E0 40%,#F3F1EC 100%)', backgroundSize: '300% 100%', animation: 'shimmer 1.5s ease infinite' }} />
          ))}

          <AnimatePresence>
            {!loading && sponsoredMarket && !selectedRegion && (
              <SponsoredMarketCard market={sponsoredMarket} onClick={() => setSelected(sponsoredMarket)} />
            )}
          </AnimatePresence>

          {!loading && sorted.map((m,i) => <MarketCard key={m.id} market={m} index={i} onClick={() => setSelected(m)} />)}

          {!loading && sorted.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 24px', border: `1px solid ${T.rule}`, borderRadius: 16, background: T.card }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#CFCAC1" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 18px', display: 'block' }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <p style={{ fontFamily: T.serif, fontSize: 19, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Aucun marché ici</p>
              <p style={{ fontFamily: T.sans, fontSize: 12.5, color: T.muted, lineHeight: 1.7, marginBottom: 22 }}>Cette région n’a pas encore de marché publié.</p>
              <button onClick={() => setSelectedRegion(null)}
                style={{ fontFamily: T.sans, fontSize: 11.5, color: T.accent, background: 'none', border: `1px solid ${T.rule}`, borderRadius: 100, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, transition: 'border-color 0.25s ease' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.rule }}>
                Voir tous les marchés
              </button>
            </div>
          )}
        </main>

        {/* ── NAVIGATION ────────────────────────────────────────────── */}
        <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 448, zIndex: 30, background: 'rgba(249,248,246,0.93)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: `1px solid ${T.rule}`, padding: '14px 32px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {NAV.map((item, i) => {
              const isActive = i === 0
              return (
                <a key={i} href={item.href}
                  style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, color: isActive ? T.accent : '#BFBBB3', transition: 'color 0.25s ease', padding: '2px 16px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={item.path} /></svg>
                  <span style={{ fontFamily: T.sans, fontSize: 9.5, fontWeight: isActive ? 600 : 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.label}</span>
                  {isActive && <span style={{ width: 3, height: 3, borderRadius: '50%', background: T.accent }} />}
                </a>
              )
            })}
          </div>
        </nav>

        <AnimatePresence>
          {selected && <MarketDrawer market={selected} onClose={() => setSelected(null)} />}
        </AnimatePresence>
      </div>
    </>
  )
}
