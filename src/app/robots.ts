import { MetadataRoute } from 'next'

// 🔧 FIX — ce fichier sert le robots.txt pour TOUS les domaines qui
// pointent vers cette app (pulse-market.fr ET whatmarket.fr), mais il
// ne déclarait que le sitemap et le host de pulse-market.fr. Un robot
// qui visite whatmarket.fr/robots.txt tombait donc sur des infos
// concernant l'autre domaine. On déclare maintenant les deux sitemaps.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ═══════════════════════════════════════
      // RÈGLE GÉNÉRALE — Tous les bots
      // ═══════════════════════════════════════
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Espaces privés
          '/dashboard',
          '/dashboard/',
          // API et backend
          '/api/',
          // Auth (callbacks et resets)
          '/auth/callback',
          '/auth/reset',
          // Pages de vérification AOT (privées)
          '/verif/',
          // Pages internes
          '/admin',
          '/_next/',
        ],
      },

      // ═══════════════════════════════════════
      // GOOGLEBOT — Règles spécifiques
      // ═══════════════════════════════════════
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/dashboard',
          '/api/',
          '/admin',
        ],
      },

      // ═══════════════════════════════════════
      // BLOQUE LES BOTS NUISIBLES (économise ton budget de crawl)
      // ═══════════════════════════════════════
      {
        userAgent: ['SemrushBot', 'AhrefsBot', 'DotBot'],
        disallow: '/',
      },
    ],
    // ✅ Les deux sitemaps, un par produit/domaine
    sitemap: [
      'https://pulse-market.fr/sitemap.xml',
      'https://whatmarket.fr/whatmarket/sitemap.xml',
    ],
    // ⚠️ NOTE : la directive "host" n'est de toute façon plus prise en
    // compte par Google depuis 2019 (elle ne l'a jamais été que par
    // Yandex). On la retire plutôt que de choisir arbitrairement un
    // domaine — inutile de trancher entre les deux ici.
  }
}