// src/app/whatmarket/exposant/[slug]/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { toSlug, extractVille, altExposant, altMarche, titleForain, descriptionForain } from '@/lib/seo'

// ── Design tokens — identiques au reste de Whatmarket ────────────────
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
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const supabase = createClient()

  const { data: exposant } = await supabase
    .from('exposant_data')
    .select('nom_commercial, produits, ville, profiles(full_name)')
    .eq('slug', params.slug)
    .single()

  if (!exposant) return { title: 'Exposant introuvable | Whatmarket' }

  const nom = exposant.nom_commercial || (exposant.profiles as any)?.full_name || 'Exposant'
  const ville = exposant.ville || ''

  // 🔧 FIX — cette page vit réellement à /whatmarket/exposant/{slug},
  // mais le canonical/OG pointaient vers /forain/{slug} (reliquat d'un
  // ancien nom de dossier). Un canonical qui ne correspond pas à
  // l'URL réelle de la page peut faire mal indexer/déclasser la page
  // par Google, et casse l'aperçu de partage sur les réseaux.
  return {
    title: titleForain(nom, ville),
    description: descriptionForain(nom, exposant.produits, ville),
    alternates: {
      canonical: `https://whatmarket.fr/whatmarket/exposant/${params.slug}`,
    },
    openGraph: {
      title: titleForain(nom, ville),
      description: descriptionForain(nom, exposant.produits, ville),
      url: `https://whatmarket.fr/whatmarket/exposant/${params.slug}`,
      images: [{ url: '/og-whatmarket.png', width: 1200, height: 630 }],
    },
  }
}

export default async function ExposantPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createClient()

  const { data: exposant } = await supabase
    .from('exposant_data')
    .select('*, profiles(full_name, email)')
    .eq('slug', params.slug)
    .single()

  if (!exposant) notFound()

  const nom = exposant.nom_commercial || (exposant.profiles as any)?.full_name || 'Exposant'
  const ville = exposant.ville || ''
  const villeSlug = toSlug(ville)
  const villeFormatted = ville.replace(/\b\w/g, (c: string) => c.toUpperCase())

  const { data: participations } = await supabase
    .from('applications')
    .select('*, events(title, start_date, location_name, cover_image)')
    .eq('exposant_id', exposant.user_id)
    .in('status', ['paid', 'present'])
    .order('created_at', { ascending: false })
    .limit(5)

  // 🔧 FIX — même correction ici : url et hasMap pointaient vers /forain/
  const schemaLocalBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": nom,
    "description": descriptionForain(nom, exposant.produits, ville),
    "url": `https://whatmarket.fr/whatmarket/exposant/${params.slug}`,
    "image": exposant.photo_url || "https://whatmarket.fr/og-whatmarket.png",
    ...(ville ? {
      "address": {
        "@type": "PostalAddress",
        "addressLocality": villeFormatted,
        "addressCountry": "FR",
      }
    } : {}),
    "hasMap": villeSlug
      ? `https://whatmarket.fr/whatmarket/marche/${villeSlug}`
      : "https://whatmarket.fr/whatmarket",
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaLocalBusiness) }}
      />

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>

      <main style={{
        maxWidth: 480, margin: '0 auto', minHeight: '100vh',
        background: T.bg, fontFamily: T.sans,
        padding: '0 0 80px',
      }}>
        {/* Header exposant */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: `radial-gradient(circle at 15% 10%, ${T.accentSoft} 0%, transparent 45%), ${T.card}`,
          padding: '52px 24px 28px',
          borderBottom: `1px solid ${T.border}`,
        }}>
          {exposant.photo_url ? (
            <img
              src={exposant.photo_url}
              alt={altExposant(nom, ville, exposant.produits)}
              width={76}
              height={76}
              style={{ borderRadius: '50%', objectFit: 'cover', marginBottom: 16, boxShadow: T.shadowCard }}
            />
          ) : (
            <div style={{ width: 76, height: 76, background: T.accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 26, fontWeight: 700, color: 'white', boxShadow: T.shadowCard }}>
              {nom.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 style={{ fontFamily: T.sans, fontSize: 26, fontWeight: 800, color: T.ink, letterSpacing: '-0.02em', marginBottom: 6 }}>
            {nom}
          </h1>
          {exposant.produits && (
            <p style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 400, color: T.body }}>{exposant.produits}</p>
          )}
        </div>

        <div style={{ padding: '22px 20px' }}>

          {/* Maillage interne — lien vers la page ville */}
          {ville && villeSlug && (
            <a
              href={`/whatmarket/marche/${villeSlug}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: T.card, borderRadius: T.radiusSm,
                padding: '14px 16px', marginBottom: 18,
                textDecoration: 'none', boxShadow: T.shadowCard,
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <div>
                <p style={{ fontFamily: T.sans, fontSize: 13.5, fontWeight: 700, color: T.ink, marginBottom: 2 }}>
                  Marché de {villeFormatted}
                </p>
                <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 400, color: T.muted }}>
                  Voir tous les marchés de cette ville →
                </p>
              </div>
            </a>
          )}

          {/* Participations */}
          {participations && participations.length > 0 && (
            <>
              <h2 style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 12 }}>
                Présent sur ces marchés
              </h2>
              {participations.map((p: any) => {
                const eventVille = extractVille(p.events?.location_name || '')
                const eventVilleSlug = toSlug(eventVille)
                return (
                  <a
                    key={p.id}
                    href={eventVilleSlug ? `/whatmarket/marche/${eventVilleSlug}` : '#'}
                    style={{
                      display: 'block', background: T.card,
                      borderRadius: T.radiusSm,
                      overflow: 'hidden', marginBottom: 10, textDecoration: 'none',
                      boxShadow: T.shadowCard,
                    }}
                  >
                    {p.events?.cover_image && (
                      <img
                        src={p.events.cover_image}
                        alt={altMarche(p.events?.title || 'Marché', eventVille)}
                        width={400}
                        height={150}
                        style={{ width: '100%', height: 120, objectFit: 'cover' }}
                      />
                    )}
                    <div style={{ padding: '13px 15px' }}>
                      <p style={{ fontFamily: T.sans, fontSize: 13.5, fontWeight: 700, color: T.ink, marginBottom: 5 }}>
                        {p.events?.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 400, color: T.muted }}>
                          {new Date(p.events?.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                          {eventVille ? ` · ${eventVille}` : ''}
                        </span>
                      </div>
                    </div>
                  </a>
                )
              })}
            </>
          )}
        </div>
      </main>
    </>
  )
}