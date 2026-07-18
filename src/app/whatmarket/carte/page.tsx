'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'

type Market = {
  id: string
  title: string
  description: string | null
  location_name: string
  start_date: string
  cover_image: string | null
  latitude: number | null
  longitude: number | null
  total_spots: number
  available_spots: number
  distance?: number
}

type GeoStatus = 'idle' | 'requesting' | 'ok' | 'denied'

// ── Design tokens — identiques à la homepage Whatmarket ────────────────
const T = {
  accent: '#0EA5E9',
  accentSoft: 'rgba(14,165,233,0.08)',
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
  gutter: 24,
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

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function fmt_dist(km: number) { return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km` }

function fmt_countdown(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff < 0) return { text: 'Terminé', color: T.muted, dot: false, pin: '#9CA3AF' }
  const h = Math.floor(diff / 3600000), d = Math.floor(h / 24)
  if (d > 1) return { text: `Dans ${d} jours`, color: T.body, dot: false, pin: '#6B7280' }
  if (d === 1) return { text: 'Demain', color: '#B45309', dot: true, pin: '#F59E0B' }
  if (h > 0) return { text: `Ferme dans ${h}h`, color: '#B91C1C', dot: true, pin: '#EF4444' }
  return { text: 'En cours', color: '#15803D', dot: true, pin: '#10B981' }
}

// ═══════════════════════════════════════════════════════════════════════
// Drawer — même structure/esprit que celui de la homepage
// ═══════════════════════════════════════════════════════════════════════
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
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,17,21,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <motion.div drag="y" dragConstraints={{ top: 0, bottom: 400 }} dragElastic={{ top: 0, bottom: 0.3 }}
        onDragEnd={(_, info) => { if (info.offset.y > 120) onClose() }}
        style={{ y, opacity, position: 'absolute', bottom: 0, left: 0, right: 0, background: T.bg, borderRadius: '28px 28px 0 0', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding: '12px 0 8px', display: 'flex', justifyContent: 'center', flexShrink: 0, background: T.bg }}>
          <div style={{ width: 36, height: 4, borderRadius: 100, background: '#D8DBE0' }} />
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ height: 220, position: 'relative' }}>
            <img src={cover} alt={market.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(10,12,16,0.62) 0%,transparent 60%)' }} />

            <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(14px)', borderRadius: 100, padding: '6px 12px', border: '1px solid rgba(255,255,255,0.24)' }}>
              {cd.dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: cd.color }} />}
              <span style={{ fontFamily: T.sans, color: cd.color, fontSize: 11.5, fontWeight: 500 }}>{cd.text}</span>
            </div>

            <div style={{ position: 'absolute', bottom: 20, left: T.gutter, right: T.gutter }}>
              <h1 style={{ fontFamily: T.sans, fontSize: 26, fontWeight: 800, color: 'white', lineHeight: 1.18, letterSpacing: '-0.02em' }}>{market.title}</h1>
            </div>
          </div>

          <div style={{ padding: `22px ${T.gutter}px 60px` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 400, color: T.body }}>{market.location_name}</span>
              {market.distance !== undefined && (
                <span style={{ fontFamily: T.sans, fontSize: 12, color: T.accent, fontWeight: 600, background: T.accentSoft, padding: '4px 11px', borderRadius: 100 }}>{fmt_dist(market.distance)}</span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
              {[
                { label: 'Date', value: new Date(market.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) },
                { label: 'Heure', value: new Date(market.start_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) },
                { label: 'Stands', value: `${occupied}/${market.total_spots}` },
              ].map((s, i) => (
                <div key={i} style={{ background: T.card, borderRadius: 16, padding: '16px 10px', textAlign: 'center', boxShadow: T.shadowCard }}>
                  <p style={{ fontFamily: T.sans, fontSize: 10.5, fontWeight: 500, color: T.muted, marginBottom: 6 }}>{s.label}</p>
                  <p style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.ink }}>{s.value}</p>
                </div>
              ))}
            </div>

            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: T.accent, color: 'white', borderRadius: 100, padding: '16px', fontFamily: T.sans, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: T.shadowFab }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              S'y rendre
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function WhatmarketCarte() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const userMarkerRef = useRef<any>(null)
  const [markets, setMarkets] = useState<Market[]>([])
  const [selected, setSelected] = useState<Market | null>(null)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMarkets = useCallback(async (lat?: number, lng?: number) => {
    try {
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      const { data: events } = await supabase.from('events').select('*')
        .eq('status', 'published').gte('start_date', today)
        .order('start_date', { ascending: true }).limit(50)
      if (!events) return []
      const enriched = events
        .filter((ev: any) => ev.latitude && ev.longitude)
        .map((ev: any) => ({
          ...ev,
          distance: lat && lng ? haversine(lat, lng, ev.latitude, ev.longitude) : undefined
        }))
      setMarkets(enriched)
      return enriched
    } catch (err) { console.error(err) }
    return []
  }, [])

  const addMarkers = useCallback((map: any, L: any, marketsData: Market[]) => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    marketsData.forEach(market => {
      if (!market.latitude || !market.longitude) return
      const cd = fmt_countdown(market.start_date)
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:36px;height:36px;cursor:pointer;">
          <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${cd.pin};border:2.5px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
            <span style="transform:rotate(45deg);font-size:14px;line-height:1;">🏪</span>
          </div>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      })
      const marker = L.marker([market.latitude, market.longitude], { icon })
        .addTo(map)
        .on('click', () => setSelected(market))
      markersRef.current.push(marker)
    })
  }, [])

  // ✅ Init Leaflet — avec hauteur explicite sur le container
  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return

    const initMap = async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      mapRef.current!.style.width = '100%'
      mapRef.current!.style.height = '100%'
      mapRef.current!.style.position = 'absolute'
      mapRef.current!.style.top = '0'
      mapRef.current!.style.left = '0'
      mapRef.current!.style.right = '0'
      mapRef.current!.style.bottom = '0'

      const map = L.map(mapRef.current!, {
        center: [43.7, 5.1],
        zoom: 10,
        zoomControl: false,
        attributionControl: false,
      })

      // Fond de carte CartoDB Voyager — épuré, cohérent avec la charte
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 20,
        subdomains: 'abcd',
      }).addTo(map)

      L.control.attribution({ position: 'bottomleft', prefix: '© OpenStreetMap © CARTO' }).addTo(map)

      mapInstanceRef.current = map

      setTimeout(() => {
        map.invalidateSize()
        setLoading(false)
      }, 200)

      const marketsData: any = await loadMarkets()
      if (marketsData?.length) addMarkers(map, L, marketsData)
    }

    initMap()
  }, [loadMarkets, addMarkers])

  const requestGeo = async () => {
    if (!navigator.geolocation) return
    setGeoStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        setUserPos({ lat, lng })
        setGeoStatus('ok')
        const map = mapInstanceRef.current
        if (!map) return
        const L = (await import('leaflet')).default
        if (userMarkerRef.current) userMarkerRef.current.remove()
        const userIcon = L.divIcon({
          className: '',
          html: `<div style="position:relative;width:20px;height:20px;">
            <div style="position:absolute;inset:0;border-radius:50%;background:rgba(14,165,233,0.2);animation:userPulse 2s ease infinite;"></div>
            <div style="position:absolute;inset:4px;border-radius:50%;background:#0EA5E9;border:2px solid white;box-shadow:0 2px 8px rgba(14,165,233,0.5);"></div>
          </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })
        userMarkerRef.current = L.marker([lat, lng], { icon: userIcon }).addTo(map)
        map.flyTo([lat, lng], 13, { duration: 1.2 })
        const marketsData = await loadMarkets(lat, lng)
        if (marketsData?.length) addMarkers(map, L, marketsData)
      },
      () => setGeoStatus('denied'),
      { timeout: 8000 }
    )
  }

  const centerOnUser = () => {
    if (userPos && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userPos.lat, userPos.lng], 13, { duration: 1 })
    } else {
      requestGeo()
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html, body { height: 100%; overflow: hidden; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: ${T.bg}; }
        ::-webkit-scrollbar { display: none; }
        .leaflet-container { background: ${T.bg} !important; }
        .leaflet-control-attribution { font-size: 9px !important; background: rgba(255,255,255,0.7) !important; }
        .leaflet-tile-pane { filter: saturate(1.1) contrast(1.02); }
        @keyframes userPulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.8); opacity: 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{
        position: 'fixed', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, height: '100dvh', overflow: 'hidden', fontFamily: T.sans,
      }}>

        <div ref={mapRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', zIndex: 0 }} />

        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 400, color: T.body }}>Chargement de la carte…</p>
            </div>
          </div>
        )}

        {/* ── TOP BAR — même identité que la homepage ─────────────────── */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, padding: `52px ${T.gutter}px 16px`, background: 'linear-gradient(to bottom, rgba(248,249,250,0.95) 55%, transparent)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="20" fill={T.accent}/>
                <path d="M8 13L13 27L20 17L27 27L32 13" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <p style={{ fontFamily: T.sans, fontSize: 17, fontWeight: 800, color: T.ink, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Carte</p>
                <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 400, color: T.muted, marginTop: 2 }}>
                  {markets.length > 0 ? `${markets.length} marché${markets.length > 1 ? 's' : ''}` : 'Chargement…'}
                </p>
              </div>
            </div>

            <button onClick={requestGeo}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: geoStatus === 'ok' ? T.card : T.accent,
                border: `1px solid ${geoStatus === 'ok' ? T.border : T.accent}`,
                borderRadius: 100, padding: '9px 15px', cursor: 'pointer',
                boxShadow: geoStatus === 'ok' ? T.shadowCard : T.shadowFab,
                transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
              }}>
              {geoStatus === 'requesting'
                ? <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={geoStatus === 'ok' ? T.accent : 'white'} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              }
              <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: geoStatus === 'ok' ? T.accent : 'white' }}>
                {geoStatus === 'ok' ? 'Localisé' : geoStatus === 'requesting' ? 'Recherche…' : 'Me localiser'}
              </span>
            </button>
          </div>
        </div>

        {/* ── LÉGENDE — carte flottante ─────────────────────────────── */}
        <div style={{ position: 'absolute', top: 128, left: T.gutter, zIndex: 20, background: T.card, borderRadius: T.radiusSm, padding: '10px 14px', boxShadow: T.shadowCard }}>
          {[
            { color: '#10B981', label: 'En cours' },
            { color: '#F59E0B', label: 'Demain' },
            { color: T.muted, label: 'Bientôt' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: i < 2 ? 5 : 0 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.color }} />
              <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 500, color: T.body }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* ── CENTRER ──────────────────────────────────────────────── */}
        <button onClick={centerOnUser}
          style={{ position: 'absolute', bottom: 108, right: T.gutter, zIndex: 20, width: 48, height: 48, borderRadius: '50%', background: T.card, border: 'none', cursor: 'pointer', boxShadow: T.shadowCard, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={geoStatus === 'ok' ? T.accent : T.body} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
          </svg>
        </button>

        {/* ── ZOOM ─────────────────────────────────────────────────── */}
        <div style={{ position: 'absolute', bottom: 168, right: T.gutter, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 1, borderRadius: T.radiusSm, overflow: 'hidden', boxShadow: T.shadowCard }}>
          {['+', '−'].map((label, i) => (
            <button key={i}
              onClick={() => { const map = mapInstanceRef.current; if (map) i === 0 ? map.zoomIn() : map.zoomOut() }}
              style={{ width: 42, height: 42, background: T.card, border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 400, color: T.body, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: i === 0 ? `1px solid ${T.border}` : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── NAVIGATION — identique à la homepage ────────────────────── */}
        <nav style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: `1px solid ${T.border}`, padding: '14px 32px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {NAV.map((item, i) => {
              const isActive = i === 1
              return (
                <a key={i} href={item.href}
                  style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, color: isActive ? T.accent : '#B4B9C0', transition: 'color 0.25s ease', padding: '2px 16px' }}>
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