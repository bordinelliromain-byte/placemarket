'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import {
  ArrowRight, ArrowLeft, CheckCircle, Building2, Users, Calendar,
  Calculator, Send, Loader, ShieldCheck, Sparkles, Phone, Mail,
  Landmark, Tent, Handshake, Map, ShoppingCart, Award
} from 'lucide-react'

type Step = 1 | 2 | 3 | 4 | 5

type FormData = {
  organisationType: 'mairie' | 'communaute' | 'comite' | 'association' | 'tourisme' | 'syndicat' | ''
  organisationName: string
  population: '<5000' | '5000-20000' | '20000-50000' | '50000-100000' | '>100000' | ''
  marketsPerMonth: '1-2' | '3-8' | '9-20' | '20+' | ''
  avgExhibitors: '<20' | '20-50' | '50-100' | '100+' | ''
  extraPlaciers: number
  moduleFestival: boolean
  formationPresentiel: boolean
  slaPremium: boolean
  contactName: string
  contactRole: string
  contactEmail: string
  contactPhone: string
  message: string
}

function calculatePrice(d: FormData): { monthly: number; oneShot: number; breakdown: string[] } {
  const breakdown: string[] = []
  let monthly = 0

  const baseByPop: Record<string, number> = {
    '<5000': 150,
    '5000-20000': 300,
    '20000-50000': 500,
    '50000-100000': 800,
    '>100000': 1200,
  }
  const base = baseByPop[d.population] || 300
  monthly += base
  breakdown.push(`Forfait de base : ${base} €/mois`)

  const multipliers: Record<string, number> = {
    '1-2': 1,
    '3-8': 1.3,
    '9-20': 1.6,
    '20+': 2,
  }
  const mult = multipliers[d.marketsPerMonth] || 1
  if (mult > 1) {
    const extra = Math.round(base * (mult - 1))
    monthly = Math.round(base * mult)
    breakdown.push(`Volume marchés (× ${mult}) : +${extra} €/mois`)
  }

  if (d.extraPlaciers > 0) {
    monthly += d.extraPlaciers * 20
    breakdown.push(`${d.extraPlaciers} compte(s) placier supplémentaire(s) : +${d.extraPlaciers * 20} €/mois`)
  }
  if (d.moduleFestival) {
    monthly += 50
    breakdown.push(`Module festival/brocante : +50 €/mois`)
  }
  if (d.slaPremium) {
    monthly += 100
    breakdown.push(`SLA Premium : +100 €/mois`)
  }

  let oneShot = 0
  if (d.formationPresentiel) {
    oneShot += 500
    breakdown.push(`Formation présentiel : 500 € (frais uniques)`)
  }

  return { monthly, oneShot, breakdown }
}

// Couleur de marque
const BRAND = '#4F46E5'

export default function DevisPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)
  const [data, setData] = useState<FormData>({
    organisationType: '',
    organisationName: '',
    population: '',
    marketsPerMonth: '',
    avgExhibitors: '',
    extraPlaciers: 0,
    moduleFestival: false,
    formationPresentiel: false,
    slaPremium: false,
    contactName: '',
    contactRole: '',
    contactEmail: '',
    contactPhone: '',
    message: '',
  })

  // ✅ Honeypot anti-bot — doit rester vide, les bots le remplissent souvent
  const [website, setWebsite] = useState('')

  const price = calculatePrice(data)
  const progress = (step / 5) * 100

  const next = () => setStep((s) => Math.min(5, (s + 1)) as Step)
  const prev = () => setStep((s) => Math.max(1, (s - 1)) as Step)

  const canContinue = () => {
    if (step === 1) return data.organisationType !== ''
    if (step === 2) return data.organisationName && data.population && data.marketsPerMonth && data.avgExhibitors
    if (step === 3) return true
    if (step === 4) return true
    if (step === 5) return data.contactName && data.contactEmail && data.contactPhone
    return false
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const payload = {
        organisation_type: data.organisationType,
        organisation_name: data.organisationName,
        population: data.population,
        markets_per_month: data.marketsPerMonth,
        avg_exhibitors: data.avgExhibitors,
        extra_placiers: data.extraPlaciers,
        module_festival: data.moduleFestival,
        formation_presentiel: data.formationPresentiel,
        sla_premium: data.slaPremium,
        contact_name: data.contactName,
        contact_role: data.contactRole,
        contact_email: data.contactEmail,
        contact_phone: data.contactPhone,
        message: data.message,
        estimated_monthly: price.monthly,
        estimated_one_shot: price.oneShot,
        status: 'new',
      }

      // 1. Save Supabase (payload SANS le honeypot — pas de colonne "website" dans devis_requests)
      const { error } = await supabase.from('devis_requests').insert(payload)
      if (error) console.error('Supabase error:', error)

      // 2. ✅ Send email notification AVEC le honeypot (l'API notify-devis le vérifie)
      try {
        await fetch('/api/notify-devis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, website }),
        })
      } catch (e) {
        console.error('Email notification failed:', e)
      }

      // 3. Redirection succès
      router.push('/?devis=success')
    } catch (err: any) {
      alert('Erreur : ' + err.message)
    }
    setSubmitting(false)
  }

  // ✅ Icônes par type d'organisation (au lieu d'emojis)
  const orgIcons: Record<string, React.ReactNode> = {
    mairie: <Landmark size={22} style={{ color: BRAND }} />,
    communaute: <Landmark size={22} style={{ color: BRAND }} />,
    comite: <Tent size={22} style={{ color: BRAND }} />,
    association: <Handshake size={22} style={{ color: BRAND }} />,
    tourisme: <Map size={22} style={{ color: BRAND }} />,
    syndicat: <ShoppingCart size={22} style={{ color: BRAND }} />,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '14px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => router.push('/')}>
            <img src="/logo-pulsemarket.svg" alt="PulseMarket" width={28} height={28} style={{ borderRadius: 8 }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>Pulse<span style={{ color: BRAND, fontWeight: 400 }}>Market</span></span>
          </div>
          <button onClick={() => router.push('/')} style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={13} /> Retour au site
          </button>
        </div>
      </header>

      <main style={{ padding: '40px 24px 60px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>

          {/* Titre */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EEF2FF', color: BRAND, padding: '5px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, border: '1px solid #C7D2FE', marginBottom: 16 }}>
                <Sparkles size={12} /> Devis sur mesure en 2 minutes
              </span>
              <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F172A', marginBottom: 8, lineHeight: 1.15 }}>
                Demandez votre devis personnalisé
              </h1>
              <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>
                Calibrez votre besoin et obtenez une estimation transparente. Notre équipe vous rappelle sous 24h ouvrées.
              </p>
            </div>
          </motion.div>

          {/* Progression */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Étape {step} sur 5</span>
              <span style={{ fontSize: 12, color: BRAND, fontWeight: 600 }}>{Math.round(progress)} %</span>
            </div>
            <div style={{ height: 4, background: '#E2E8F0', borderRadius: 100, overflow: 'hidden' }}>
              <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} style={{ height: '100%', background: 'linear-gradient(90deg, #4F46E5, #7C3AED)' }} />
            </div>
          </div>

          {/* Card */}
          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, padding: 32 }}>
            <AnimatePresence mode="wait">

              {/* ✅ ÉTAPE 1 — Type d'organisation avec ICÔNES (plus d'emojis) */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Vous êtes...</h2>
                  <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>Choisissez le profil qui correspond à votre structure.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    {[
                      { v: 'mairie', label: 'Mairie / Commune', icon: <Landmark size={22} /> },
                      { v: 'communaute', label: 'Communauté de communes', icon: <Building2 size={22} /> },
                      { v: 'comite', label: 'Comité des fêtes', icon: <Tent size={22} /> },
                      { v: 'association', label: 'Association', icon: <Handshake size={22} /> },
                      { v: 'tourisme', label: 'Office de tourisme', icon: <Map size={22} /> },
                      { v: 'syndicat', label: 'Syndicat de marchés', icon: <ShoppingCart size={22} /> },
                    ].map(opt => (
                      <button key={opt.v} onClick={() => setData({ ...data, organisationType: opt.v as any })}
                        style={{
                          background: data.organisationType === opt.v ? '#EEF2FF' : '#F8FAFC',
                          border: `2px solid ${data.organisationType === opt.v ? BRAND : '#E2E8F0'}`,
                          borderRadius: 10, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s'
                        }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: data.organisationType === opt.v ? BRAND : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s', border: data.organisationType === opt.v ? 'none' : '1px solid #E2E8F0' }}>
                          <span style={{ color: data.organisationType === opt.v ? 'white' : BRAND, display: 'flex' }}>
                            {opt.icon}
                          </span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: data.organisationType === opt.v ? BRAND : '#0F172A' }}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ÉTAPE 2 — Volume */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Votre structure</h2>
                  <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>Ces informations nous aident à calibrer votre devis.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Nom de votre commune / structure</label>
                      <input value={data.organisationName} onChange={e => setData({ ...data, organisationName: e.target.value })} placeholder="Ex : Mairie d'Aubagne"
                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 14, color: '#0F172A', outline: 'none', boxSizing: 'border-box' }}
                        onFocus={e => e.target.style.borderColor = BRAND}
                        onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Population de la commune</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                        {[
                          { v: '<5000', l: '< 5 000 hab.' },
                          { v: '5000-20000', l: '5K - 20K hab.' },
                          { v: '20000-50000', l: '20K - 50K hab.' },
                          { v: '50000-100000', l: '50K - 100K hab.' },
                          { v: '>100000', l: '> 100K hab.' },
                        ].map(opt => (
                          <button key={opt.v} onClick={() => setData({ ...data, population: opt.v as any })}
                            style={{
                              background: data.population === opt.v ? '#EEF2FF' : '#F8FAFC',
                              border: `2px solid ${data.population === opt.v ? BRAND : '#E2E8F0'}`,
                              borderRadius: 9, padding: '10px 8px', fontSize: 12, fontWeight: 600,
                              color: data.population === opt.v ? BRAND : '#0F172A', cursor: 'pointer'
                            }}>{opt.l}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Nombre de marchés par mois</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                        {[
                          { v: '1-2', l: '1 à 2 marchés' },
                          { v: '3-8', l: '3 à 8 marchés' },
                          { v: '9-20', l: '9 à 20 marchés' },
                          { v: '20+', l: '20+ marchés' },
                        ].map(opt => (
                          <button key={opt.v} onClick={() => setData({ ...data, marketsPerMonth: opt.v as any })}
                            style={{
                              background: data.marketsPerMonth === opt.v ? '#EEF2FF' : '#F8FAFC',
                              border: `2px solid ${data.marketsPerMonth === opt.v ? BRAND : '#E2E8F0'}`,
                              borderRadius: 9, padding: '10px 8px', fontSize: 12, fontWeight: 600,
                              color: data.marketsPerMonth === opt.v ? BRAND : '#0F172A', cursor: 'pointer'
                            }}>{opt.l}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Nombre moyen d'exposants par marché</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
                        {[
                          { v: '<20', l: '< 20' },
                          { v: '20-50', l: '20 à 50' },
                          { v: '50-100', l: '50 à 100' },
                          { v: '100+', l: '100+' },
                        ].map(opt => (
                          <button key={opt.v} onClick={() => setData({ ...data, avgExhibitors: opt.v as any })}
                            style={{
                              background: data.avgExhibitors === opt.v ? '#EEF2FF' : '#F8FAFC',
                              border: `2px solid ${data.avgExhibitors === opt.v ? BRAND : '#E2E8F0'}`,
                              borderRadius: 9, padding: '10px 8px', fontSize: 12, fontWeight: 600,
                              color: data.avgExhibitors === opt.v ? BRAND : '#0F172A', cursor: 'pointer'
                            }}>{opt.l}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ÉTAPE 3 — Options */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Options (facultatif)</h2>
                  <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>Personnalisez votre forfait selon vos besoins.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Comptes placiers supplémentaires</p>
                          <p style={{ fontSize: 11, color: '#94A3B8' }}>1 compte placier inclus · +20€/mois par compte additionnel</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[0, 1, 2, 3, 4, 5].map(n => (
                          <button key={n} onClick={() => setData({ ...data, extraPlaciers: n })}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 8,
                              background: data.extraPlaciers === n ? BRAND : 'white',
                              border: `1px solid ${data.extraPlaciers === n ? BRAND : '#E2E8F0'}`,
                              color: data.extraPlaciers === n ? 'white' : '#0F172A',
                              fontSize: 13, fontWeight: 600, cursor: 'pointer'
                            }}>+{n}</button>
                        ))}
                      </div>
                    </div>

                    {[
                      { k: 'moduleFestival' as const, label: 'Module festival / brocante', sub: 'Gestion d\'événements ponctuels', price: '+50 €/mois' },
                      { k: 'slaPremium' as const, label: 'SLA Premium', sub: 'Support prioritaire 7j/7, intervention <4h', price: '+100 €/mois' },
                      { k: 'formationPresentiel' as const, label: 'Formation présentiel', sub: 'Notre équipe se déplace chez vous (1 journée)', price: '500 € unique' },
                    ].map(opt => (
                      <button key={opt.k} onClick={() => setData({ ...data, [opt.k]: !data[opt.k] })}
                        style={{
                          background: data[opt.k] ? '#EEF2FF' : '#F8FAFC',
                          border: `2px solid ${data[opt.k] ? BRAND : '#E2E8F0'}`,
                          borderRadius: 10, padding: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left'
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: 6, border: `2px solid ${data[opt.k] ? BRAND : '#CBD5E1'}`,
                            background: data[opt.k] ? BRAND : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            {data[opt.k] && <CheckCircle size={14} style={{ color: 'white' }} />}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{opt.label}</p>
                            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{opt.sub}</p>
                          </div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: data[opt.k] ? BRAND : '#64748B' }}>{opt.price}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ÉTAPE 4 — Estimation */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Votre estimation</h2>
                  <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>Tarif indicatif basé sur vos réponses. Notre équipe vous fournira un devis officiel adapté.</p>

                  <div style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', borderRadius: 14, padding: 28, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Calculator size={16} style={{ color: 'white' }} />
                      <span style={{ fontSize: 12, color: 'white', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85 }}>Estimation mensuelle</span>
                    </div>
                    <p style={{ fontSize: 44, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: 4 }}>{price.monthly} €<span style={{ fontSize: 18, color: 'white', fontWeight: 500, opacity: 0.75 }}> / mois</span></p>
                    {price.oneShot > 0 && (
                      <p style={{ fontSize: 13, color: '#FCD34D', fontWeight: 600 }}>+ {price.oneShot} € de frais uniques (formation)</p>
                    )}
                    <p style={{ fontSize: 12, color: 'white', marginTop: 10, lineHeight: 1.6, opacity: 0.85 }}>
                      Sans engagement de durée · Résiliation 30 jours · Aucune carte requise pour le devis
                    </p>
                  </div>

                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 18 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Détail du calcul</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {price.breakdown.map((line, i) => (
                        <p key={i} style={{ fontSize: 12, color: '#475569', display: 'flex', gap: 6 }}>
                          <span style={{ color: BRAND }}>→</span> {line}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* ✅ Inclus avec icône check violette (plus d'emojis) */}
                  <div style={{ marginTop: 16, padding: '16px 18px', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <CheckCircle size={14} style={{ color: BRAND }} />
                      <p style={{ fontSize: 12, fontWeight: 700, color: BRAND }}>Inclus dans tous les forfaits</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6 }}>
                      {['Setup offert (valeur 500€)', 'Formation visio offerte', 'Mises à jour gratuites', 'Support email <24h', 'Hébergement France RGPD', 'Sauvegarde quotidienne'].map((f, i) => (
                        <p key={i} style={{ fontSize: 11, color: '#4338CA', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CheckCircle size={11} style={{ color: BRAND }} /> {f}
                        </p>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ÉTAPE 5 — Contact */}
              {step === 5 && (
                <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Vos coordonnées</h2>
                  <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>Notre équipe vous rappelle sous 24h ouvrées avec votre devis officiel.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[
                      { k: 'contactName' as const, label: 'Nom et prénom', placeholder: 'Ex : Marie Dupont', required: true },
                      { k: 'contactRole' as const, label: 'Fonction', placeholder: 'Ex : Adjoint au commerce', required: false },
                      { k: 'contactEmail' as const, label: 'Email professionnel', placeholder: 'mairie@aubagne.fr', required: true, type: 'email' },
                      { k: 'contactPhone' as const, label: 'Téléphone direct', placeholder: '04 XX XX XX XX', required: true, type: 'tel' },
                    ].map(f => (
                      <div key={f.k}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                          {f.label} {f.required && <span style={{ color: '#DC2626' }}>*</span>}
                        </label>
                        <input value={data[f.k]} onChange={e => setData({ ...data, [f.k]: e.target.value })} placeholder={f.placeholder} type={f.type || 'text'}
                          style={{ width: '100%', padding: '11px 14px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 14, color: '#0F172A', outline: 'none', boxSizing: 'border-box' }}
                          onFocus={e => e.target.style.borderColor = BRAND}
                          onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
                      </div>
                    ))}

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Message (facultatif)</label>
                      <textarea value={data.message} onChange={e => setData({ ...data, message: e.target.value })} placeholder="Précisions sur vos besoins, calendrier de mise en place souhaité..."
                        rows={3}
                        style={{ width: '100%', padding: '11px 14px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 14, color: '#0F172A', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
                        onFocus={e => e.target.style.borderColor = BRAND}
                        onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
                    </div>

                    {/* ✅ Honeypot anti-bot — invisible pour un humain, visible/rempli par les bots */}
                    <div style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
                      <label htmlFor="website">Ne pas remplir ce champ</label>
                      <input
                        type="text"
                        id="website"
                        name="website"
                        value={website}
                        onChange={e => setWebsite(e.target.value)}
                        tabIndex={-1}
                        autoComplete="off"
                      />
                    </div>

                    <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 10, padding: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <ShieldCheck size={15} style={{ color: BRAND, flexShrink: 0, marginTop: 2 }} />
                      <p style={{ fontSize: 12, color: '#4338CA', lineHeight: 1.6 }}>
                        <strong>Vos données sont protégées.</strong> RGPD compliant. Aucune utilisation commerciale tierce. Vous pouvez demander la suppression à tout moment.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, paddingTop: 20, borderTop: '1px solid #F1F5F9' }}>
              <button onClick={prev} disabled={step === 1}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#64748B', fontSize: 13, fontWeight: 500, cursor: step === 1 ? 'not-allowed' : 'pointer', opacity: step === 1 ? 0.3 : 1, padding: '8px 0' }}>
                <ArrowLeft size={14} /> Précédent
              </button>

              {step < 5 ? (
                <button onClick={next} disabled={!canContinue()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: canContinue() ? BRAND : '#CBD5E1', color: 'white', border: 'none', borderRadius: 9, padding: '11px 22px', fontSize: 13, fontWeight: 600, cursor: canContinue() ? 'pointer' : 'not-allowed', transition: 'background 0.15s' }}>
                  Continuer <ArrowRight size={14} />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={!canContinue() || submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: canContinue() ? BRAND : '#CBD5E1', color: 'white', border: 'none', borderRadius: 9, padding: '11px 22px', fontSize: 13, fontWeight: 600, cursor: canContinue() ? 'pointer' : 'not-allowed' }}>
                  {submitting ? <><Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Envoi...</> : <><Send size={14} /> Envoyer ma demande</>}
                </button>
              )}
            </div>
          </div>

          {/* ✅ Trust signals SANS emojis */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 24, flexWrap: 'wrap' }}>
            {[
              { icon: <Award size={11} />, label: '100% Français' },
              { icon: <ShieldCheck size={11} />, label: 'Conforme RGPD' },
              { icon: <CheckCircle size={11} />, label: 'AOT CGPPP' },
              { icon: <Building2 size={11} />, label: 'Hébergement France' },
            ].map((t, i) => (
              <span key={i} style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: BRAND }}>{t.icon}</span>
                {t.label}
              </span>
            ))}
          </div>

        </div>
      </main>
    </div>
  )
}