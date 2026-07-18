// src/app/whatmarket/page.tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'

type Market = {
  id: string; title: string; description: string | null; location_name: string
  start_date: string; cover_image: string | null; latitude: number | null; longitude: number | null
  total_spots: number; available_spots: number; exposants_count?: number; distance?: number; sponsored?: boolean
}
type GeoStatus = 'idle' | 'requesting' | 'ok' | 'denied'
type BonPlan = { nom: string; offre: string; detail: string; adresse: string; photo_url: string }
type BoostExposant = { nom: string; offre: string; stand: string; photo_url: string }
type ExposantRow = { business_name: string; category: string | null; produits: string | null; photo_url: string | null; spot_label: string | null }

// ── Design tokens « Airbnb-like » ──────────────────────────────────────
const T = {
  accent: '#0EA5E9',
  accentSoft: 'rgba(14,165,233,0.08)',
  accentBorder: 'rgba(14,165,233,0.25)',
  gold: '#B8860B',
  goldSoft: '#FDF6E3',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  ink: '#12151A',
  body: '#5B6270',
  muted: '#9AA1AB',
  border: '#ECEDF0',
  divider: '#F0F1F3',
  sans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  radius: 24,
  radiusSm: 16,
  shadowCard: '0 4px 12px rgba(15,23,42,0.05)',
  shadowCardHover: '0 16px 36px rgba(15,23,42,0.10)',
  shadowFab: '0 8px 20px rgba(14,165,233,0.28)',
  gutter: 24,
  stack: 36,
}

// ── Icônes ────────────────────────────────────────────────────────────
function IconShop({ color = T.muted, size = 20 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function IconStar({ color = T.accent, size = 16, filled = true }: { color?: string; size?: number; filled?: boolean }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={filled ? 'none' : color} strokeWidth="1.6"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
}
function IconPin({ color = 'white', size = 12 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
}
function IconSend({ color = 'white', size = 12 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
}
function IconShare({ color = T.body, size = 13 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
}
function IconChevron({ color = 'white', size = 14 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
}
function IconClose({ color = T.ink, size = 16 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function IconTag({ color = T.muted, size = 13 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41L13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
}

function SectionHead({ eyebrow, title, aside }: { eyebrow: string; title: string; aside?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 16 }}>
      <div>
        <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 500, color: T.muted, marginBottom: 4, letterSpacing: '0.01em' }}>{eyebrow}</p>
        <h3 style={{ fontFamily: T.sans, fontSize: 19, fontWeight: 700, color: T.ink, letterSpacing: '-0.01em', lineHeight: 1.25 }}>{title}</h3>
      </div>
      {aside}
    </div>
  )
}

// Séparateur très léger entre sections
function Divider() {
  return <div style={{ height: 1, background: T.divider, margin: `${T.stack}px 0` }} />
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}
function fmt_dist(km: number) { return km < 1 ? `${Math.round(km*1000)} m` : `${km.toFixed(1)} km` }

function fmt_countdown(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff < 0) return { text: 'Terminé', color: 'rgba(255,255,255,0.65)', dot: false }
  const h = Math.floor(diff/3600000), d = Math.floor(h/24)
  if (d > 1) return { text: `Dans ${d} jours`, color: 'rgba(255,255,255,0.95)', dot: false }
  if (d === 1) return { text: 'Demain', color: '#FDE68A', dot: true }
  if (h > 0) return { text: `Ferme dans ${h}h`, color: '#FCA5A5', dot: true }
  return { text: 'En cours', color: '#86EFAC', dot: true }
}

const COVERS = [
  'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=900&q=80',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&q=80',
  'https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=900&q=80',
]

const NAV = [
  { label: 'Accueil', href: '/whatmarket', path: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10' },
  { label: 'Carte', href: '/whatmarket/carte', path: 'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16' },
  { label: 'Pro', href: '/pro/ads/new', path: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
]

const REGIONS = [
  { id: 'paca', label: 'Bouches-du-Rhône', dept: '13' },
  { id: 'occitanie', label: 'Occitanie', dept: '34' },
  { id: 'aura', label: 'Auvergne-Rhône-Alpes', dept: '69' },
  { id: 'naq', label: 'Nouvelle-Aquitaine', dept: '33' },
  { id: 'pdl', label: 'Pays de la Loire', dept: '44' },
  { id: 'idf', label: 'Île-de-France', dept: '75' },
  { id: 'hdf', label: 'Hauts-de-France', dept: '59' },
  { id: 'gest', label: 'Grand Est', dept: '67' },
  { id: 'bfc', label: 'Bourgogne', dept: '21' },
  { id: 'norm', label: 'Normandie', dept: '76' },
  { id: 'bzh', label: 'Bretagne', dept: '29' },
  { id: 'cvl', label: 'Centre-Val de Loire', dept: '45' },
]

const liftIn = (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.transform = 'translateY(-4px)'
  e.currentTarget.style.boxShadow = T.shadowCardHover
}
const liftOut = (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.transform = 'translateY(0)'
  e.currentTarget.style.boxShadow = T.shadowCard
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2 — « Bons Plans du Quartier » — pubs commerçants (boost_ads)
// UI magazine, horizontale, épurée : photo + offre + bouton "Voir"
// ═══════════════════════════════════════════════════════════════════════
function BonsPlansQuartier({ marketId }: { marketId: string }) {
  const [items, setItems] = useState<BonPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { createClient } = await import('@/lib/supabase')
        const supabase = createClient()
        const { data } = await supabase.from('boost_ads')
          .select('nom, offre, detail, adresse, photo_url')
          .eq('event_id', marketId).eq('status', 'active')
          .order('created_at', { ascending: false }).limit(8)
        if (data) setItems(data.map((i: any) => ({
          nom: i.nom, offre: i.offre, detail: i.detail || '', adresse: i.adresse || '', photo_url: i.photo_url || '',
        })))
      } catch (err) {}
      setLoading(false)
    }
    load()
  }, [marketId])

  if (loading || items.length === 0) return null
  return (
    <section>
      <SectionHead eyebrow="Partenaires · Sponsorisé" title="Bons plans du quartier" />
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', margin: `0 -${T.gutter}px`, padding: `2px ${T.gutter}px 6px` }}>
        {items.map((plan, i) => (
          <div key={i} style={{ scrollSnapAlign: 'start', flexShrink: 0, width: 200, background: T.card, borderRadius: T.radiusSm, overflow: 'hidden', boxShadow: T.shadowCard }}>
            <div style={{ height: 110, background: T.border }}>
              {plan.photo_url
                ? <img src={plan.photo_url} alt={plan.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconShop size={22} /></div>
              }
            </div>
            <div style={{ padding: '13px 14px 15px' }}>
              <p style={{ fontFamily: T.sans, fontSize: 13.5, fontWeight: 700, color: T.ink, lineHeight: 1.3, marginBottom: 3 }}>{plan.nom}</p>
              <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 400, color: T.body, lineHeight: 1.45, marginBottom: 11, minHeight: 17 }}>{plan.offre}</p>
              <a href={plan.adresse ? `https://www.google.com/maps/search/${encodeURIComponent(plan.adresse)}` : '#'}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: T.accent, textDecoration: 'none', border: `1px solid ${T.accentBorder}`, borderRadius: 100, padding: '6px 13px' }}>
                Voir <IconChevron color={T.accent} size={10} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 3 — « À ne pas manquer » — exposants boostés (exposant_boosts)
// Priorité visuelle FORTE : plus grand, accent doré, distinct des pubs
// ═══════════════════════════════════════════════════════════════════════
function ANePasManquer({ marketId }: { marketId: string }) {
  const [boosts, setBoosts] = useState<BoostExposant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { createClient } = await import('@/lib/supabase')
        const supabase = createClient()
        const { data } = await supabase.from('exposant_boosts')
          .select('nom, offre, stand, photo_url')
          .eq('event_id', marketId).eq('status', 'active')
          .order('created_at', { ascending: false }).limit(3)
        if (data) setBoosts(data.map((b: any) => ({
          nom: b.nom, offre: b.offre, stand: b.stand || '', photo_url: b.photo_url || '',
        })))
      } catch (err) {}
      setLoading(false)
    }
    load()
  }, [marketId])

  if (loading || boosts.length === 0) return null
  return (
    <section>
      <SectionHead
        eyebrow="Boosté par Pulse Market"
        title="À ne pas manquer"
        aside={<IconStar color={T.gold} size={17} />}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {boosts.map((b, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 16,
            background: `linear-gradient(135deg, ${T.goldSoft} 0%, ${T.card} 55%)`,
            border: `1px solid #F0E4BE`,
            borderRadius: T.radiusSm, padding: '16px 18px',
            boxShadow: '0 6px 18px rgba(184,134,11,0.10)',
          }}>
            <div style={{ width: 62, height: 62, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: T.card, boxShadow: T.shadowCard }}>
              {b.photo_url
                ? <img src={b.photo_url} alt={b.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconStar color={T.gold} size={22} /></div>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <IconStar color={T.gold} size={11} />
                <p style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>{b.nom}</p>
              </div>
              <p style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 400, color: T.body, lineHeight: 1.5 }}>
                {b.offre}{b.stand ? ` · ${b.stand}` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4 — « Les exposants présents » — liste exhaustive, organique
// Vertical, sobre, clairement distincte des sections partenaires au-dessus
// ═══════════════════════════════════════════════════════════════════════
function ExposantsPresents({ marketId }: { marketId: string }) {
  const [rows, setRows] = useState<ExposantRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { createClient } = await import('@/lib/supabase')
        const supabase = createClient()
        const { data } = await supabase
          .from('applications')
          .select('spot_label, exposant_data:exposant_id(business_name, category, produits, photo_url)')
          .eq('event_id', marketId)
          .in('status', ['paid', 'present'])
          .limit(50)
        if (data) {
          const list = data
            .map((row: any) => row.exposant_data ? { ...row.exposant_data, spot_label: row.spot_label } : null)
            .filter((e: any) => e && e.business_name)
          setRows(list)
        }
      } catch (err) {}
      setLoading(false)
    }
    load()
  }, [marketId])

  if (loading || rows.length === 0) return null
  return (
    <section>
      <SectionHead eyebrow={`${rows.length} validé${rows.length > 1 ? 's' : ''} par la mairie`} title="Les exposants présents" />
      <div style={{ background: T.card, borderRadius: T.radiusSm, boxShadow: T.shadowCard, overflow: 'hidden' }}>
        {rows.map((exp, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderTop: i === 0 ? 'none' : `1px solid ${T.divider}` }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: T.border }}>
              {exp.photo_url
                ? <img src={exp.photo_url} alt={exp.business_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconShop size={17} /></div>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.35, marginBottom: 1 }}>{exp.business_name}</p>
              <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 400, color: T.muted, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {exp.category || exp.produits || 'Exposant du marché'}
              </p>
            </div>
            {exp.spot_label && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 100, padding: '5px 11px' }}>
                <IconTag size={11} />
                <span style={{ fontFamily: T.sans, fontSize: 11.5, fontWeight: 600, color: T.body }}>{exp.spot_label}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Carte flottante — pour la grille de la page d'accueil
// ═══════════════════════════════════════════════════════════════════════
function MarketCard({ market, index, onClick, large = false }: { market: Market; index: number; onClick: () => void; large?: boolean }) {
  const cd = fmt_countdown(market.start_date)
  const cover = market.cover_image || COVERS[index % COVERS.length]
  const occupied = market.total_spots - market.available_spots
  const pct = market.total_spots > 0 ? (occupied/market.total_spots)*100 : 0
  return (
    <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index*0.06, ease: [0.22,1,0.36,1] }}
      onClick={onClick} style={{ cursor: 'pointer' }}>
      <div
        style={{ borderRadius: T.radius, overflow: 'hidden', background: T.card, boxShadow: T.shadowCard, transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s cubic-bezier(0.22,1,0.36,1)' }}
        onMouseEnter={liftIn} onMouseLeave={liftOut}>
        <div style={{ position: 'relative', height: large ? 240 : 208, overflow: 'hidden' }}>
          <img src={cover} alt={market.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(10,12,16,0.55) 0%,rgba(10,12,16,0.02) 55%,transparent 100%)' }} />
          <div style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderRadius: 100, padding: '6px 12px', border: '1px solid rgba(255,255,255,0.22)' }}>
              {cd.dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: cd.color, display: 'block' }} />}
              <span style={{ fontFamily: T.sans, color: cd.color, fontSize: 11.5, fontWeight: 500 }}>{cd.text}</span>
            </div>
            {market.distance !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderRadius: 100, padding: '6px 12px', border: '1px solid rgba(255,255,255,0.22)' }}>
                <IconSend size={11} /><span style={{ fontFamily: T.sans, color: 'white', fontSize: 11.5, fontWeight: 500 }}>{fmt_dist(market.distance)}</span>
              </div>
            )}
          </div>
          {market.sponsored && (
            <div style={{ position: 'absolute', bottom: 14, left: 16, display: 'flex', alignItems: 'center', gap: 6, background: T.accent, borderRadius: 100, padding: '5px 11px' }}>
              <IconStar color="white" size={9} /><span style={{ fontFamily: T.sans, color: 'white', fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }}>Sélection</span>
            </div>
          )}
        </div>
        <div style={{ padding: '18px 20px 20px' }}>
          <h2 style={{ fontFamily: T.sans, fontSize: large ? 19 : 17, fontWeight: 700, color: T.ink, lineHeight: 1.3, letterSpacing: '-0.01em', marginBottom: 6 }}>{market.title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <IconPin color={T.muted} size={12} /><span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 400, color: T.body }}>{market.location_name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div style={{ display: 'flex', gap: 18 }}>
              <div>
                <p style={{ fontFamily: T.sans, fontSize: 10.5, fontWeight: 500, color: T.muted, marginBottom: 3 }}>Date</p>
                <p style={{ fontFamily: T.sans, fontSize: 13, color: T.ink, fontWeight: 600 }}>{new Date(market.start_date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</p>
              </div>
              <div>
                <p style={{ fontFamily: T.sans, fontSize: 10.5, fontWeight: 500, color: T.muted, marginBottom: 3 }}>Stands</p>
                <p style={{ fontFamily: T.sans, fontSize: 13, color: T.ink, fontWeight: 600 }}>{occupied}/{market.total_spots}</p>
              </div>
            </div>
            <div style={{ width: 36, height: 36, background: T.accentSoft, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IconChevron color={T.accent} size={14} />
            </div>
          </div>
        </div>
        <div style={{ height: 3, background: T.border }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, delay: 0.3+index*0.05 }} style={{ height: '100%', background: pct>80 ? '#F97066' : T.accent }} />
        </div>
      </div>
    </motion.article>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// MARKET DRAWER — cœur de la conversion
// ═══════════════════════════════════════════════════════════════════════
function MarketDrawer({ market, onClose }: { market: Market; onClose: () => void }) {
  const cd = fmt_countdown(market.start_date)
  const cover = market.cover_image || COVERS[0]
  const mapsUrl = market.latitude && market.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${market.latitude},${market.longitude}`
    : `https://www.google.com/maps/search/${encodeURIComponent(market.location_name)}`
  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 200], [1, 0])

  // ── Gestion de scroll : mini bandeau compact qui apparaît proprement ──
  const scrollRef = useRef<HTMLDivElement>(null)
  const [compactHeader, setCompactHeader] = useState(false)
  const onScroll = () => {
    if (!scrollRef.current) return
    setCompactHeader(scrollRef.current.scrollTop > 200)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: market.title, text: `Retrouve ${market.title} sur Whatmarket`, url: window.location.href })
    } else { navigator.clipboard?.writeText(window.location.href) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,17,21,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <motion.div drag="y" dragConstraints={{ top: 0, bottom: 400 }} dragElastic={{ top: 0, bottom: 0.3 }}
        onDragEnd={(_, info) => { if (info.offset.y > 120) onClose() }}
        style={{ y, opacity, position: 'absolute', bottom: 0, left: 0, right: 0, background: T.bg, borderRadius: '28px 28px 0 0', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        onClick={e => e.stopPropagation()}>

        {/* Poignée de drag */}
        <div style={{ padding: '12px 0 8px', display: 'flex', justifyContent: 'center', flexShrink: 0, background: T.bg, zIndex: 3 }}>
          <div style={{ width: 36, height: 4, borderRadius: 100, background: '#D8DBE0' }} />
        </div>

        {/* Bandeau compact — apparaît proprement au scroll, reste visible */}
        <AnimatePresence>
          {compactHeader && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 4, background: 'rgba(248,249,250,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${T.border}`, padding: `14px ${T.gutter}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <p style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{market.title}</p>
              <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: T.card, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <IconClose size={13} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={scrollRef} onScroll={onScroll} style={{ overflowY: 'auto', flex: 1 }}>

          {/* ── 1. HEADER IMMERSIF ────────────────────────────────────── */}
          <div style={{ height: 280, position: 'relative' }}>
            <img src={cover} alt={market.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(10,12,16,0.66) 0%,rgba(10,12,16,0.05) 55%,transparent 100%)' }} />

            <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <IconClose />
            </button>

            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(14px)', borderRadius: 100, padding: '6px 12px', border: '1px solid rgba(255,255,255,0.24)' }}>
              {cd.dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: cd.color }} />}
              <span style={{ fontFamily: T.sans, color: cd.color, fontSize: 11.5, fontWeight: 500 }}>{cd.text}</span>
            </div>

            <div style={{ position: 'absolute', bottom: 20, left: T.gutter, right: T.gutter }}>
              <h1 style={{ fontFamily: T.sans, fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 10 }}>{market.title}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <IconPin color="rgba(255,255,255,0.8)" size={12} />
                  <span style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 400, color: 'rgba(255,255,255,0.85)' }}>{market.location_name}</span>
                </div>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
                <span style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 400, color: 'rgba(255,255,255,0.85)' }}>
                  {new Date(market.start_date).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
                </span>
              </div>
            </div>
          </div>

          <div style={{ padding: `22px ${T.gutter}px 100px` }}>

            {/* Bouton d'action très visible — priorité absolue */}
            <div style={{ display: 'flex', gap: 10, marginBottom: T.stack }}>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: T.accent, color: 'white', borderRadius: 100, padding: '16px', fontFamily: T.sans, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: T.shadowFab, transition: 'transform 0.25s ease' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}>
                <IconSend size={16} /> S'y rendre
              </a>
              <button onClick={handleShare}
                style={{ width: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.card, border: `1px solid ${T.border}`, borderRadius: 100, cursor: 'pointer', flexShrink: 0, boxShadow: T.shadowCard }}>
                <IconShare color={T.ink} size={16} />
              </button>
            </div>

            {market.description && (
              <p style={{ fontFamily: T.sans, fontSize: 14.5, fontWeight: 400, color: T.body, lineHeight: 1.75, marginBottom: T.stack }}>{market.description}</p>
            )}

            {/* ── 2. BONS PLANS DU QUARTIER ─────────────────────────────── */}
            <BonsPlansQuartier marketId={market.id} />
            <Divider />

            {/* ── 3. À NE PAS MANQUER ───────────────────────────────────── */}
            <ANePasManquer marketId={market.id} />
            <Divider />

            {/* ── 4. LES EXPOSANTS PRÉSENTS ─────────────────────────────── */}
            <ExposantsPresents marketId={market.id} />

          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Page d'accueil
// ═══════════════════════════════════════════════════════════════════════
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
    fontFamily: T.sans, padding: '9px 16px', borderRadius: 100,
    border: `1px solid ${active ? T.accent : T.border}`, cursor: 'pointer',
    fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0,
    background: active ? T.accent : T.card, color: active ? '#FFFFFF' : T.body,
    transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)', boxShadow: active ? '0 4px 12px rgba(14,165,233,0.22)' : 'none',
  })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        html,body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:${T.bg};color:${T.body};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
        ::-webkit-scrollbar{display:none;}*{scrollbar-width:none;}
        @keyframes shimmer{0%{background-position:-300px 0}100%{background-position:300px 0}}
        @keyframes pulse-ring{0%,100%{box-shadow:0 0 0 0 rgba(14,165,233,0.30)}50%{box-shadow:0 0 0 9px rgba(14,165,233,0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .pulse-ring{animation:pulse-ring 1.8s ease infinite}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important;}}
      `}</style>

      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: T.bg, position: 'relative', fontFamily: T.sans }}>

        <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(248,249,250,0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: `52px ${T.gutter}px 18px` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="30" height="30" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="20" fill={T.accent}/>
                <path d="M8 13L13 27L20 17L27 27L32 13" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: '-0.02em' }}>Whatmarket</span>
            </div>
            <button onClick={geoStatus==='idle'||geoStatus==='denied'?requestGeo:undefined}
              className={geoStatus==='requesting'?'pulse-ring':''}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
                background: geoStatus==='ok' ? T.card : T.accent,
                border: `1px solid ${geoStatus==='ok' ? T.border : T.accent}`,
                borderRadius: 100, padding: '10px 16px',
                cursor: geoStatus==='requesting' ? 'default' : 'pointer',
                boxShadow: geoStatus==='ok' ? T.shadowCard : T.shadowFab,
                transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
              }}>
              {geoStatus==='requesting'
                ? <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : <IconSend color={geoStatus==='ok' ? T.accent : 'white'} size={12} />}
              <span style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 600, color: geoStatus==='ok' ? T.accent : 'white' }}>
                {geoStatus==='ok' ? 'Localisé' : geoStatus==='requesting' ? 'Recherche…' : 'Autour de moi'}
              </span>
            </button>
          </div>

          <h1 style={{ fontFamily: T.sans, fontSize: 26, fontWeight: 800, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 18 }}>
            {selectedRegion ? regionLabel : geoStatus==='ok' ? 'Marchés près de vous' : 'Trouvez votre marché'}
          </h1>

          <div style={{ display: 'flex', gap: 9, marginBottom: 12 }}>
            {(['bientot','proche','tous'] as const).map((f,i) => (
              <button key={f} onClick={() => setFilter(f)} style={chip(filter===f)}>{['Bientôt','Le plus proche','Tous'][i]}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 9, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}>
            <button onClick={() => setSelectedRegion(null)} style={chip(!selectedRegion)}>Toute la France</button>
            {REGIONS.map(r => (
              <button key={r.id} onClick={() => setSelectedRegion(selectedRegion === r.id ? null : r.id)} style={chip(selectedRegion === r.id)}>{r.label}</button>
            ))}
          </div>
        </header>

        <main style={{ padding: `${T.gutter}px ${T.gutter}px 120px` }}>

          <AnimatePresence>
            {geoStatus==='idle' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                style={{ background: T.card, borderRadius: T.radiusSm, padding: '20px 22px', marginBottom: T.stack, display: 'flex', alignItems: 'center', gap: 16, boxShadow: T.shadowCard }}>
                <div style={{ width: 40, height: 40, background: T.accentSoft, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconPin color={T.accent} size={17} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: T.sans, fontSize: 14.5, fontWeight: 700, color: T.ink, marginBottom: 3 }}>Marchés près de chez vous</p>
                  <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 400, color: T.muted, lineHeight: 1.5 }}>Activez la géolocalisation pour voir les distances</p>
                </div>
                <button onClick={requestGeo} style={{ background: T.accent, color: 'white', border: 'none', borderRadius: 100, padding: '10px 16px', fontFamily: T.sans, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Activer</button>
              </motion.div>
            )}
          </AnimatePresence>

          {selectedRegion && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
              <span style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 400, color: T.muted }}>{sorted.length} marché{sorted.length > 1 ? 's' : ''} en {regionLabel}</span>
              <button onClick={() => setSelectedRegion(null)} style={{ marginLeft: 'auto', fontFamily: T.sans, fontSize: 12.5, color: T.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Effacer</button>
            </div>
          )}

          {loading && [1,2,3].map(i => (
            <div key={i} style={{ height: 300, borderRadius: T.radius, marginBottom: 22, background: 'linear-gradient(90deg,#EEF0F2 0%,#E4E7EB 40%,#EEF0F2 100%)', backgroundSize: '300% 100%', animation: 'shimmer 1.5s ease infinite' }} />
          ))}

          {!loading && sponsoredMarket && !selectedRegion && (
            <section style={{ marginBottom: T.stack }}>
              <SectionHead eyebrow="Sponsorisé" title="À la une" />
              <MarketCard market={sponsoredMarket} index={0} onClick={() => setSelected(sponsoredMarket)} large />
            </section>
          )}

          {!loading && sorted.length > 0 && (
            <section>
              <SectionHead eyebrow={`${sorted.length} résultat${sorted.length > 1 ? 's' : ''}`} title="Tous les marchés" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {sorted.map((m,i) => <MarketCard key={m.id} market={m} index={i} onClick={() => setSelected(m)} />)}
              </div>
            </section>
          )}

          {!loading && sorted.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 24px', borderRadius: T.radius, background: T.card, boxShadow: T.shadowCard }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: T.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                <IconPin color={T.accent} size={22} />
              </div>
              <p style={{ fontFamily: T.sans, fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Aucun marché ici</p>
              <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 400, color: T.muted, lineHeight: 1.6, marginBottom: 22 }}>Cette région n'a pas encore de marché publié.</p>
              <button onClick={() => setSelectedRegion(null)} style={{ fontFamily: T.sans, fontSize: 13, color: T.accent, background: T.accentSoft, border: 'none', borderRadius: 100, padding: '11px 22px', cursor: 'pointer', fontWeight: 600 }}>Voir tous les marchés</button>
            </div>
          )}
        </main>

        <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 30, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: `1px solid ${T.border}`, padding: '14px 32px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {NAV.map((item, i) => {
              const isActive = i === 0
              return (
                <a key={i} href={item.href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, color: isActive ? T.accent : '#B4B9C0', transition: 'color 0.25s ease', padding: '2px 16px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.path} /></svg>
                  <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
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