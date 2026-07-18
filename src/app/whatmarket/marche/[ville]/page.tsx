// src/app/whatmarket/marche/[ville]/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase'

// ── Design tokens — identiques à la homepage Whatmarket, pour la cohérence ──
const T = {
  accent: '#0EA5E9',
  accentSoft: 'rgba(14,165,233,0.08)',
  accentBorder: 'rgba(14,165,233,0.22)',
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

const FALLBACK_VILLES = [
  'aubagne', 'cassis', 'la-ciotat', 'marseille', 'aix-en-provence',
  'toulon', 'nice', 'arles', 'avignon', 'salon-de-provence',
  'martigues', 'istres', 'vitrolles', 'marignane', 'gardanne',
  'roquevaire', 'auriol', 'gemenos', 'cuges-les-pins', 'ceyreste',
]

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ── Génération des métadonnées dynamiques par ville ─────────────────────
export async function generateMetadata({
  params,
}: {
  params: { ville: string }
}): Promise<Metadata> {
  const villeFormatted = decodeURIComponent(params.ville)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return {
    title: `Marché de ${villeFormatted} — Horaires, exposants et infos | Whatmarket`,
    description: `Découvrez le marché de ${villeFormatted} : horaires d'ouverture, liste des exposants, producteurs locaux et artisans. Itinéraire et informations pratiques.`,
    keywords: [
      `marché ${villeFormatted}`,
      `marché de ${villeFormatted} horaires`,
      `marché forain ${villeFormatted}`,
      `producteurs locaux ${villeFormatted}`,
      `brocante ${villeFormatted}`,
    ],
    alternates: { canonical: `https://whatmarket.fr/marche/${params.ville}` },
    openGraph: {
      title: `Marché de ${villeFormatted} — Horaires et exposants`,
      description: `Tout sur le marché de ${villeFormatted} : horaires, exposants, producteurs et artisans locaux.`,
      url: `https://whatmarket.fr/marche/${params.ville}`,
      images: [{ url: '/og-whatmarket.png', width: 1200, height: 630 }],
    },
  }
}

// ── Génération statique des pages villes ────────────────────────────────
// ✅ Fusionne la liste PACA de référence AVEC les villes réellement
// utilisées par des marchés publiés en base — dès qu'une mairie publie
// un marché dans une ville qui n'est pas dans la liste, sa page SEO
// se génère automatiquement au prochain build, sans y toucher à la main.
export async function generateStaticParams() {
  const villesSet = new Set<string>(FALLBACK_VILLES)

  try {
    const supabase = createClient()
    const { data: events } = await supabase
      .from('events')
      .select('city, location_name')
      .eq('status', 'published')
      .limit(500)

    events?.forEach((ev: any) => {
      const raw = ev.city || ev.location_name
      if (raw) villesSet.add(slugify(raw))
    })
  } catch (err) {
    // En cas d'erreur Supabase au build, on retombe sur la liste fixe —
    // le build ne doit jamais planter à cause de ça.
  }

  return Array.from(villesSet).map((ville) => ({ ville }))
}

// ── Schéma Event pour Google ─────────────────────────────────────────────
function buildEventSchema(ville: string, events: any[]) {
  return events.map((event) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.title,
    "description": event.description || `Marché de ${ville} — exposants locaux, producteurs et artisans`,
    "startDate": event.start_date,
    "endDate": event.end_date || event.start_date,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "location": {
      "@type": "Place",
      "name": event.location_name || `Marché de ${ville}`,
      "address": { "@type": "PostalAddress", "addressLocality": ville, "addressCountry": "FR" },
      ...(event.latitude && event.longitude ? {
        "geo": { "@type": "GeoCoordinates", "latitude": event.latitude, "longitude": event.longitude }
      } : {}),
    },
    "organizer": { "@type": "Organization", "name": "Whatmarket", "url": "https://whatmarket.fr" },
    "offers": {
      "@type": "Offer", "price": "0", "priceCurrency": "EUR", "availability": "https://schema.org/InStock",
      "url": `https://whatmarket.fr/marche/${ville.toLowerCase().replace(/ /g, '-')}`,
    },
    "image": event.cover_image || "https://whatmarket.fr/og-whatmarket.png",
  }))
}

function fmt_countdown(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff < 0) return { text: 'Terminé', color: T.muted }
  const h = Math.floor(diff/3600000), d = Math.floor(h/24)
  if (d > 1) return { text: `Dans ${d} jours`, color: T.body }
  if (d === 1) return { text: 'Demain', color: '#B45309' }
  if (h > 0) return { text: `Ferme dans ${h}h`, color: '#B91C1C' }
  return { text: 'En cours', color: '#15803D' }
}

// ── Page ville ───────────────────────────────────────────────────────────
export default async function MarcheVillePage({
  params,
}: {
  params: { ville: string }
}) {
  const villeSlug = params.ville
  const villeFormatted = decodeURIComponent(villeSlug)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  const supabase = createClient()
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'published')
    .ilike('location_name', `%${villeFormatted}%`)
    .order('start_date', { ascending: true })
    .limit(10)

  const eventSchemas = buildEventSchema(villeFormatted, events || [])
  const hasEvents = events && events.length > 0

  return (
    <>
      {eventSchemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": `Marché de ${villeFormatted}`,
            "description": `Retrouvez tous les marchés de ${villeFormatted} : producteurs locaux, artisans, brocantes et marchés alimentaires.`,
            "url": `https://whatmarket.fr/marche/${villeSlug}`,
            "address": { "@type": "PostalAddress", "addressLocality": villeFormatted, "addressCountry": "FR" },
            "image": "https://whatmarket.fr/og-whatmarket.png",
          })
        }}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .vmk-card{transition:transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s cubic-bezier(0.22,1,0.36,1);}
        .vmk-card:hover{transform:translateY(-3px); box-shadow:0 16px 32px rgba(15,23,42,0.10);}
        .vmk-cta{transition:transform 0.2s ease;}
        .vmk-cta:hover{transform:translateY(-2px);}
      `}</style>

      <main style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: T.bg, fontFamily: T.sans }}>

        {/* ── Hero ville — motif discret, pas de photo générique ─────── */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: `radial-gradient(circle at 15% 20%, ${T.accentSoft} 0%, transparent 45%), radial-gradient(circle at 85% 0%, rgba(14,165,233,0.06) 0%, transparent 40%), ${T.card}`,
          padding: `52px ${T.gutter}px 30px`,
          borderBottom: `1px solid ${T.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <svg width="22" height="22" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="20" fill={T.accent}/>
              <path d="M8 13L13 27L20 17L27 27L32 13" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>Whatmarket</span>
            <span style={{ fontSize: 12, color: T.muted }}>·</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: T.muted }}>Marchés locaux</span>
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 800, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 10 }}>
            Marché de {villeFormatted}
          </h1>
          <p style={{ fontSize: 14.5, fontWeight: 400, color: T.body, lineHeight: 1.6, marginBottom: hasEvents ? 20 : 0 }}>
            Horaires, exposants et informations pratiques, mis à jour en temps réel.
          </p>

          {hasEvents && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: T.accentSoft, borderRadius: 100, padding: '7px 14px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: T.accent }}>
                {events!.length} marché{events!.length > 1 ? 's' : ''} à venir
              </span>
            </div>
          )}
        </div>

        <div style={{ padding: `${T.gutter}px ${T.gutter}px 90px` }}>
          {hasEvents ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {events!.map((event) => {
                const cd = fmt_countdown(event.start_date)
                const occupied = (event.total_spots ?? 0) - (event.available_spots ?? 0)
                return (
                  <div key={event.id} className="vmk-card"
                    style={{ background: T.card, borderRadius: T.radius, padding: '22px 22px 20px', boxShadow: T.shadowCard }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cd.color }} />
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: cd.color }}>{cd.text}</span>
                    </div>

                    <h3 style={{ fontSize: 18, fontWeight: 700, color: T.ink, lineHeight: 1.3, letterSpacing: '-0.01em', marginBottom: 12 }}>
                      {event.title}
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span style={{ fontSize: 13, fontWeight: 400, color: T.body }}>
                          {new Date(event.start_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span style={{ fontSize: 13, fontWeight: 400, color: T.body }}>{event.location_name}</span>
                      </div>
                      {event.total_spots > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                          <span style={{ fontSize: 13, fontWeight: 400, color: T.body }}>{occupied}/{event.total_spots} stands occupés</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      {event.latitude && event.longitude && (
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`}
                          target="_blank" rel="noopener noreferrer" className="vmk-cta"
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: T.accent, color: 'white', borderRadius: 100, padding: '12px', fontSize: 13.5, fontWeight: 600, textDecoration: 'none', boxShadow: T.shadowFab }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                          Itinéraire
                        </a>
                      )}
                      <a href="/whatmarket"
                        style={{ flex: event.latitude ? undefined : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: T.bg, color: T.ink, border: `1px solid ${T.border}`, borderRadius: 100, padding: '12px 16px', fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>
                        Voir le détail
                      </a>
                    </div>
                  </div>
                )
              })}

              <a href="/whatmarket" style={{ display: 'block', textAlign: 'center', marginTop: 6, fontSize: 13, fontWeight: 600, color: T.accent, textDecoration: 'none' }}>
                Voir tous les marchés autour de {villeFormatted} →
              </a>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '64px 24px', background: T.card, borderRadius: T.radius, boxShadow: T.shadowCard }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: T.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 8 }}>
                Pas encore de marché répertorié à {villeFormatted}
              </p>
              <p style={{ fontSize: 13.5, fontWeight: 400, color: T.muted, lineHeight: 1.6, marginBottom: 22 }}>
                Vous organisez un marché à {villeFormatted} ?
              </p>
              <a href="https://pulse-market.fr/auth/mairie" className="vmk-cta"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.accent, color: 'white', padding: '13px 24px', borderRadius: 100, fontSize: 13.5, fontWeight: 600, textDecoration: 'none', boxShadow: T.shadowFab }}>
                Référencer mon marché →
              </a>
            </div>
          )}
        </div>
      </main>
    </>
  )
}