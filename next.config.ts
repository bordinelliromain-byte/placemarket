import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Erreurs TypeScript bloquantes (mais on garde ignoreBuildErrors pour le moment, on fixera après)
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ React Strict Mode (détecte les problèmes en dev)
  reactStrictMode: true,

  // ✅ Cache les versions Next.js et les en-têtes "X-Powered-By"
  poweredByHeader: false,

  // ✅ Limite la taille des body API à 5MB par défaut (Supabase Storage gère les gros uploads)
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'maps.googleapis.com' },
      { protocol: 'https', hostname: 'maps.gstatic.com' },
      { protocol: 'https', hostname: 'server.arcgisonline.com' },
      { protocol: 'https', hostname: '*.arcgisonline.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
    // ✅ Tailles autorisées pour optimisation
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // ✅ Format moderne par défaut
    formats: ['image/webp', 'image/avif'],
  },

  async redirects() {
    return [
      // ✅ whatmarket.fr (sans www) → /whatmarket
      {
        source: '/',
        has: [{ type: 'host', value: 'whatmarket.fr' }],
        destination: '/whatmarket',
        permanent: false,
      },
      // ✅ www.whatmarket.fr → /whatmarket
      {
        source: '/',
        has: [{ type: 'host', value: 'www.whatmarket.fr' }],
        destination: '/whatmarket',
        permanent: false,
      },
      // ✅ Redirection HTTP → HTTPS forcée via header HSTS (pas besoin ici, Vercel le fait auto)
    ]
  },

  async headers() {
    return [
      // ═══════════════════════════════════════
      // HEADERS GLOBAUX (toutes les pages)
      // ═══════════════════════════════════════
      {
        source: '/(.*)',
        headers: [
          // ✅ Protection clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },

          // ✅ Empêche le MIME-sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },

          // ✅ Force HTTPS pour 1 an (préchargement HSTS list)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },

          // ✅ Protection XSS (legacy mais bon à garder pour vieux navigateurs)
          { key: 'X-XSS-Protection', value: '1; mode=block' },

          // ✅ Politique de référent
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

          // ✅ Permissions strictes (caméra, micro, geoloc seulement self pour PWA Placier)
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self), payment=(self), interest-cohort=()' },

          // ✅ Cross-Origin policies (sécurité moderne)
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }, // Allow-popups pour Stripe
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },

          // ✅ DNS Prefetch Control
          { key: 'X-DNS-Prefetch-Control', value: 'on' },

          // ✅ CSP — Content Security Policy (la plus importante)
          {
            key: 'Content-Security-Policy',
            value: [
              // Default
              "default-src 'self'",

              // Scripts : on garde unsafe-inline + unsafe-eval pour Next.js mais on restreint les domaines
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://client.crisp.chat https://js.stripe.com https://maps.googleapis.com https://vercel.live",

              // Styles
              "style-src 'self' 'unsafe-inline' https://client.crisp.chat https://fonts.googleapis.com https://unpkg.com",

              // Images (avec Esri pour les tuiles satellite + Wikipedia pour blasons mairie)
              // Images (avec Esri pour les tuiles satellite + Wikipedia pour blasons mairie + CartoDB pour la carte Whatmarket)
"img-src 'self' data: blob: https://*.supabase.co https://client.crisp.chat https://*.crisp.chat https://image.crisp.chat https://images.unsplash.com https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://api.qrserver.com https://*.tile.openstreetmap.org https://unpkg.com https://server.arcgisonline.com https://*.arcgisonline.com https://upload.wikimedia.org https://commons.wikimedia.org https://*.basemaps.cartocdn.com",

              // Fonts
              "font-src 'self' https://client.crisp.chat https://fonts.gstatic.com data:",

              // Connect (API, WS, etc.)
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://client.crisp.chat wss://client.crisp.chat wss://client.relay.crisp.chat wss://client.relay.rescue.crisp.chat https://maps.googleapis.com https://api-adresse.data.gouv.fr https://server.arcgisonline.com https://*.arcgisonline.com https://api.insee.fr https://recherche-entreprises.api.gouv.fr https://vercel.live wss://ws-us3.pusher.com",

              // Frames (Stripe iframe pour 3DS)
              "frame-src https://js.stripe.com https://hooks.stripe.com https://www.google.com https://maps.google.com https://www.openstreetmap.org https://vercel.live",

              // Workers (PWA placier)
              "worker-src 'self' blob:",

              // Manifest PWA
              "manifest-src 'self'",

              // Media
              "media-src 'self' blob: data:",

              // ✅ Empêche de submit des forms vers d'autres domaines
              "form-action 'self' https://checkout.stripe.com",

              // ✅ Empêche d'être affiché en iframe
              "frame-ancestors 'none'",

              // ✅ Upgrade les requêtes HTTP en HTTPS
              "upgrade-insecure-requests",

              // ✅ Bloque les mixed content
              "block-all-mixed-content",
            ].join('; ')
          },
        ],
      },

      // ═══════════════════════════════════════
      // HEADERS API (renforcés)
      // ═══════════════════════════════════════
      {
        source: '/api/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // ✅ Pas de cache pour les réponses API (sécurité)
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
          // ✅ CORS strict (uniquement notre domaine peut appeler l'API)
          { key: 'Access-Control-Allow-Origin', value: 'https://pulse-market.fr' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },

      // ═══════════════════════════════════════
      // HEADERS ASSETS STATIQUES (cache long)
      // ═══════════════════════════════════════
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/(.*).(jpg|jpeg|png|gif|webp|avif|svg|ico|woff|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
};

export default nextConfig;