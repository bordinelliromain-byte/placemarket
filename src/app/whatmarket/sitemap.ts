import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase'

// 🔧 FIX — l'ancien sitemap ne listait que 2 URLs (accueil + carte).
// Toutes les pages ville et exposant, qui portent l'essentiel de
// l'effort SEO local, n'apparaissaient jamais dedans — donc Google
// mettait plus de temps à les découvrir. On les génère maintenant
// dynamiquement à partir de la base.

const FALLBACK_VILLES = [
  'aubagne', 'cassis', 'la-ciotat', 'marseille', 'aix-en-provence',
  'toulon', 'nice', 'arles', 'avignon', 'salon-de-provence',
  'martigues', 'istres', 'vitrolles', 'marignane', 'gardanne',
  'roquevaire', 'auriol', 'gemenos', 'cuges-les-pins', 'ceyreste',
]

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://whatmarket.fr'

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/whatmarket`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/whatmarket/carte`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  ]

  let villeUrls: MetadataRoute.Sitemap = []
  let exposantUrls: MetadataRoute.Sitemap = []

  try {
    const supabase = createClient()

    // ── Pages ville : liste de référence + villes réellement en base ──
    const villesSet = new Set<string>(FALLBACK_VILLES)
    const { data: events } = await supabase
      .from('events')
      .select('city, location_name')
      .eq('status', 'published')
      .limit(500)

    events?.forEach((ev: any) => {
      const raw = ev.city || ev.location_name
      if (raw) villesSet.add(slugify(raw))
    })

    villeUrls = Array.from(villesSet).map((ville) => ({
      url: `${baseUrl}/whatmarket/marche/${ville}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }))

    // ── Pages exposant — toutes celles qui ont un slug renseigné ──
    const { data: exposants } = await supabase
      .from('exposant_data')
      .select('slug')
      .not('slug', 'is', null)
      .limit(1000)

    exposantUrls = (exposants || [])
      .filter((e: any) => e.slug)
      .map((e: any) => ({
        url: `${baseUrl}/whatmarket/exposant/${e.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
  } catch (err) {
    // Le sitemap ne doit jamais planter à cause d'une erreur Supabase —
    // on retombe sur les URLs statiques seules.
    console.error('[sitemap] Erreur génération dynamique:', err)
  }

  return [...staticUrls, ...villeUrls, ...exposantUrls]
}