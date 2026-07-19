'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { downloadAOT } from '@/lib/generateAOT'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import Sidebar from '@/components/Sidebar'
import {
  CalendarCheck, MapPin, CheckCircle,
  Calendar, Trophy, ArrowRight, Search,
  FileText, Share2, Navigation, Euro,
  TrendingUp, Star, Award
} from 'lucide-react'

const BRAND = '#4F46E5'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

function getLevel(count: number) {
  if (count >= 50) return { label: 'Platine', color: '#0EA5E9', next: null }
  if (count >= 20) return { label: 'Or', color: '#F59E0B', next: 50 }
  if (count >= 5)  return { label: 'Argent', color: '#64748B', next: 20 }
  return { label: 'Bronze', color: '#EA580C', next: 5 }
}

export default function MesMarches() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [candidatures, setCandidatures] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const router = useRouter()
  const supabase = createClient()
  const isMobile = useIsMobile()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)
      // ✅ Récupère aussi nom mairie + lat/lng pour itinéraire
      const { data: apps } = await supabase.from('applications')
        .select(`*, events:event_id(id, title, start_date, end_date, location_name, image_url, price_per_spot, latitude, longitude, organisateur_id, organisateur:organisateur_id(full_name))`)
        .eq('exposant_id', user.id).eq('status', 'paid').order('created_at', { ascending: false })
      setCandidatures(apps || [])
      setLoading(false)
    }
    getData()
  }, [])

  const now = new Date()

  // ✅ Filtrage par search
  const filteredCandidatures = useMemo(() => {
    if (!search) return candidatures
    const s = search.toLowerCase()
    return candidatures.filter(c =>
      c.events?.title?.toLowerCase().includes(s) ||
      c.events?.location_name?.toLowerCase().includes(s)
    )
  }, [candidatures, search])

  const upcoming = filteredCandidatures.filter(c => c.events?.start_date && new Date(c.events.start_date) >= now)
  const past = filteredCandidatures.filter(c => c.events?.start_date && new Date(c.events.start_date) < now)

  // ✅ Stats
  const totalSpent = candidatures.reduce((sum, c) => sum + (c.events?.price_per_spot || 0), 0)
  const totalMarkets = candidatures.length
  const level = getLevel(totalMarkets)

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const formatShort = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // ✅ Télécharge AOT
  const handleDownloadAOT = (c: any) => {
    downloadAOT({
      candidatureId: c.id,
      exposantNom: profile?.full_name || '',
      exposantSiren: undefined,
      exposantBusinessName: undefined,
      exposantProduits: undefined,
      eventTitle: c.events?.title || '',
      eventDate: c.events?.start_date ? new Date(c.events.start_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '',
      eventLocation: c.events?.location_name || '',
      caseNumber: c.case_number,
      mairieNom: c.events?.organisateur?.full_name || 'Mairie',
      paidAt: c.paid_at ? new Date(c.paid_at).toLocaleDateString('fr-FR') : '',
    })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: `2px solid ${BRAND}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar profile={profile} />

      <div style={{ marginLeft: isMobile ? 0 : 220, flex: 1, minWidth: 0 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: isMobile ? '0 14px 0 60px' : '0 28px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#EEF2FF', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarCheck size={13} style={{ color: BRAND }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Mes marchés</p>
              <p style={{ fontSize: 11, color: '#94A3B8' }}>{upcoming.length} à venir · {past.length} passé(s)</p>
            </div>
          </div>
          <button onClick={() => router.push('/dashboard/evenements')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: BRAND, color: 'white', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            {isMobile ? <ArrowRight size={14} /> : <><span>Trouver un marché</span><ArrowRight size={13} /></>}
          </button>
        </header>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        <main style={{ padding: isMobile ? '14px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <motion.div variants={stagger} initial="hidden" animate="visible">

            {/* ✅ STATS HEADER */}
            <motion.section variants={fadeUp} style={{ marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { label: 'Marchés faits', value: totalMarkets, icon: <Trophy size={14} style={{ color: '#F59E0B' }} />, color: '#F59E0B' },
                  { label: 'Total dépensé', value: `${totalSpent}€`, icon: <Euro size={14} style={{ color: '#16A34A' }} />, color: '#16A34A' },
                  { label: 'À venir', value: upcoming.length, icon: <Calendar size={14} style={{ color: BRAND }} />, color: BRAND },
                  { label: 'Niveau', value: level.label, icon: <Award size={14} style={{ color: level.color }} />, color: level.color },
                ].map((stat, i) => (
                  <div key={i} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      {stat.icon}
                      <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</p>
                    </div>
                    <p style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: '#0F172A' }}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* ✅ SEARCH */}
            {candidatures.length > 0 && (
              <motion.section variants={fadeUp} style={{ marginBottom: 20 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un marché..."
                    style={{ width: '100%', padding: '9px 14px 9px 36px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13, color: '#0F172A', background: 'white', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = BRAND}
                    onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
                </div>
              </motion.section>
            )}

            {/* Prochains marchés */}
            <motion.section variants={fadeUp} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <CalendarCheck size={15} style={{ color: BRAND }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Prochains marchés</p>
                <span style={{ background: '#EEF2FF', color: BRAND, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>{upcoming.length}</span>
              </div>

              {upcoming.length === 0 ? (
                <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
                  <CalendarCheck size={32} style={{ margin: '0 auto 12px', color: '#CBD5E1' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Aucun marché à venir</p>
                  <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 18 }}>Postulez à des marchés pour les voir apparaître ici</p>
                  <button onClick={() => router.push('/dashboard/evenements')}
                    style={{ background: BRAND, color: 'white', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Voir les marchés disponibles
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {upcoming.map((c) => {
                    const days = daysUntil(c.events.start_date)
                    const isToday = days === 0
                    const isSoon = days <= 7
                    const hasCoords = c.events.latitude && c.events.longitude
                    return (
                      <motion.div key={c.id} variants={fadeUp}
                        style={{ background: 'white', border: `1px solid ${isToday ? BRAND : isSoon ? '#C7D2FE' : '#E2E8F0'}`, borderRadius: 14, overflow: 'hidden' }}>

                        <div style={{ display: 'flex' }}>
                          {!isMobile && (
                            <div style={{ width: 110, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                              {c.events.image_url ? <img src={c.events.image_url} alt={c.events.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', minHeight: 110 }} />}
                              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)' }} />
                            </div>
                          )}

                          <div style={{ flex: 1, padding: isMobile ? '14px' : '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, flexWrap: 'wrap' }}>
                                <p style={{ fontSize: isMobile ? 13 : 15, fontWeight: 700, color: '#0F172A' }}>{c.events.title}</p>
                                {isToday && <span style={{ background: '#DC2626', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>AUJOURD'HUI</span>}
                                {isSoon && !isToday && <span style={{ background: '#EEF2FF', color: BRAND, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>BIENTÔT</span>}
                              </div>
                              <div style={{ display: 'flex', gap: isMobile ? 10 : 16, fontSize: 11, color: '#64748B', flexWrap: 'wrap', marginBottom: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Calendar size={10} style={{ color: BRAND }} />
                                  {isMobile ? formatShort(c.events.start_date) : formatDate(c.events.start_date)}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <MapPin size={10} style={{ color: BRAND }} />
                                  {c.events.location_name?.split(',')[0]}
                                </div>
                              </div>
                              {!isMobile && (
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, background: '#F0FDF4', color: '#16A34A', padding: '3px 10px', borderRadius: 100, border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <CheckCircle size={10} /> Place confirmée
                                  </span>
                                  <span style={{ fontSize: 11, fontWeight: 600, background: '#F8FAFC', color: '#475569', padding: '3px 10px', borderRadius: 100, border: '1px solid #E2E8F0' }}>
                                    {c.events.price_per_spot} € payé
                                  </span>
                                </div>
                              )}
                            </div>

                            <div style={{ textAlign: 'center', flexShrink: 0 }}>
                              <div style={{ width: isMobile ? 52 : 64, height: isMobile ? 52 : 64, borderRadius: 12, background: isToday ? '#DC2626' : isSoon ? BRAND : '#F8FAFC', border: `1px solid ${isToday ? '#DC2626' : isSoon ? BRAND : '#E2E8F0'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <p style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: isToday || isSoon ? 'white' : '#0F172A', lineHeight: 1 }}>{isToday ? '!' : days}</p>
                                <p style={{ fontSize: 9, fontWeight: 600, color: isToday || isSoon ? 'rgba(255,255,255,0.8)' : '#94A3B8', textTransform: 'uppercase' }}>{isToday ? 'Auj.' : 'jours'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ✅ ACTIONS — AOT + Itinéraire + Share */}
                        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid #F1F5F9', background: '#FAFBFC' }}>
                          <button onClick={() => handleDownloadAOT(c)}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#0F172A', color: 'white', border: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            <FileText size={12} /> {isMobile ? 'AOT' : 'Télécharger AOT'}
                          </button>
                          {hasCoords && (
                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${c.events.latitude},${c.events.longitude}`}
                              target="_blank" rel="noopener noreferrer"
                              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: BRAND, color: 'white', border: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
                              <Navigation size={12} /> {isMobile ? 'GPS' : 'Itinéraire'}
                            </a>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.section>

            {/* Marchés passés */}
            <motion.section variants={fadeUp}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Trophy size={15} style={{ color: '#F59E0B' }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Marchés participés</p>
                <span style={{ background: '#FFFBEB', color: '#F59E0B', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100, border: '1px solid #FDE68A' }}>{past.length}</span>
              </div>

              {past.length === 0 ? (
                <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 14, padding: '28px 20px', textAlign: 'center' }}>
                  <Trophy size={24} style={{ margin: '0 auto 8px', color: '#CBD5E1' }} />
                  <p style={{ fontSize: 13, color: '#94A3B8' }}>Votre historique apparaîtra ici après vos premiers marchés</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                  {past.map((c) => (
                    <motion.div key={c.id} variants={fadeUp}
                      style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', opacity: 0.85, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.85'}>
                      {!isMobile && (
                        <div style={{ height: 72, position: 'relative', overflow: 'hidden' }}>
                          {c.events.image_url ? <img src={c.events.image_url} alt={c.events.title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(30%)' }} />
                            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #94A3B8, #CBD5E1)' }} />}
                          <div style={{ position: 'absolute', top: 6, right: 6 }}>
                            <span style={{ background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 100 }}>TERMINÉ</span>
                          </div>
                        </div>
                      )}
                      <div style={{ padding: isMobile ? '12px 14px' : '10px 14px', display: 'flex', alignItems: isMobile ? 'center' : 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.events.title}</p>
                          <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#94A3B8' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={9} /> {formatShort(c.events.start_date)}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={9} /> {c.events.location_name?.split(',')[0]}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', flexShrink: 0 }}>{c.events.price_per_spot} €</span>
                      </div>
                      {/* ✅ Bouton AOT historique */}
                      <div style={{ padding: '0 14px 12px' }}>
                        <button onClick={() => handleDownloadAOT(c)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 7, padding: '6px 10px', fontSize: 11, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                          <FileText size={11} /> Re-télécharger AOT
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.section>

          </motion.div>
        </main>
      </div>
    </div>
  )
}