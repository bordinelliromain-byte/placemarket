// src/lib/config/country.ts
// ═════════════════════════════════════════════════════════════
// Configuration par pays — point de départ pour l'international.
//
// ⚠️ Ce fichier n'est importé nulle part pour l'instant. Il ne
// change AUCUN comportement de l'app aujourd'hui. C'est juste la
// structure prête à recevoir un fichier belgium.ts / spain.ts le
// jour venu, sans avoir à toucher au reste du code à ce moment-là.
// ═════════════════════════════════════════════════════════════

export type CountryCode = 'FR' | 'BE' | 'ES' | 'IT'

export interface CountryConfig {
  code: CountryCode
  name: string
  currency: string
  currencySymbol: string
  locale: string
  tvaRate: number
  legal: {
    companyName: string
    siren: string
    rcs: string
    vat: string
    address: string
    postalCity: string
    email: string
    site: string
  }
}

// ─── France — configuration actuelle, extraite telle quelle ───
// (mêmes valeurs que celles déjà utilisées dans generateFacture.ts
// et generateBoostInvoice.ts — ce fichier ne les remplace pas encore,
// il documente juste la même source de vérité pour plus tard)
export const FR_CONFIG: CountryConfig = {
  code: 'FR',
  name: 'France',
  currency: 'EUR',
  currencySymbol: '€',
  locale: 'fr-FR',
  tvaRate: 0.20,
  legal: {
    companyName: 'PulseMarket SAS',
    siren: '105 506 554',
    rcs: 'RCS Draguignan',
    vat: 'FR8302105506554',
    address: '661 Carreirade des Adrets',
    postalCity: "83640 Plan-d'Aups-Sainte-Baume",
    email: 'contact@pulse-market.fr',
    site: 'pulse-market.fr',
  },
}

// ─── À créer le jour où un pays s'ouvre réellement — pas avant ───
// export const BE_CONFIG: CountryConfig = { ... }
// export const ES_CONFIG: CountryConfig = { ... }

export const COUNTRY_CONFIGS: Record<CountryCode, CountryConfig | null> = {
  FR: FR_CONFIG,
  BE: null,
  ES: null,
  IT: null,
}

export function getCountryConfig(code: CountryCode): CountryConfig {
  const config = COUNTRY_CONFIGS[code]
  if (!config) {
    // Pays pas encore configuré : on retombe sur la France plutôt
    // que de planter — sécurité par défaut.
    return FR_CONFIG
  }
  return config
}