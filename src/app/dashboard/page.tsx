'use client'

import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { downloadAOT } from '@/lib/generateAOT'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import Sidebar from '@/components/Sidebar'
import OnboardingTour from '@/components/OnboardingTour'
import {
  ChevronRight, CheckCircle, Clock, Star,
  Bell, MapPin, ArrowUpRight,
  Shield, Zap, Camera, Send, Eye, CreditCard,
  Loader, Rocket, FileText, Lock,
  TrendingUp, Sparkles, AlertCircle, Hand, Map,
  FileCheck, X,
} from 'lucide-react'

// ── Design tokens — identité PulseMarket (indigo), même niveau de finition que Whatmarket ──
const T = {
  accent: '#4F46E5',
  accentSoft: 'rgba(79,70,229,0.08)',
  accentBorder: 'rgba(79,70,229,0.18)',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  ink: '#12151A',
  body: '#5B6270',
  muted: '#9AA1AB',
  border: '#ECEDF0',
  success: '#16A34A',
  successSoft: '#F0FDF4',
  successBorder: '#BBF7D0',
  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
  sans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  radius: 20,
  radiusSm: 14,
  shadowCard: '0 4px 12px rgba(15,23,42,0.05)',
  shadowCardHover: '0 12px 28px rgba(15,23,42,0.08)',
  shadowFab: '0 8px 20px rgba(79,70,229,0.25)',
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
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

function Skeleton({ w = '100%', h = 14, radius = 6, style = {} }: { w?: string | number; h?: number; radius?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ width: w, height: h, borderRadius: radius, background: 'linear-gradient(90deg, #EEF0F2 25%, #E4E7EB 50%, #EEF0F2 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', flexShrink: 0, ...style }} />
  )
}

function DashboardSkeleton({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, fontFamily: T.sans }}>
      <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ position: 'fixed', top: 0, left: isMobile ? 0 : 220, right: 0, height: 56, background: 'rgba(248,249,250,0.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', padding: isMobile ? '0 16px 0 60px' : '0 28px', gap: 10, zIndex: 10 }}>
        <div style={{ flex: 1 }}>
          <Skeleton w={140} h={13} style={{ marginBottom: 6 }} />
          <Skeleton w={100} h={10} />
        </div>
        <Skeleton w={32} h={32} radius={8} />
      </div>
      <div style={{ marginLeft: isMobile ? 0 : 220, flex: 1, padding: isMobile ? '84px 14px 20px' : '80px 28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ background: T.card, borderRadius: T.radiusSm, padding: '16px 18px', boxShadow: T.shadowCard }}>
              <Skeleton w={80} h={10} style={{ marginBottom: 12 }} />
              <Skeleton w={50} h={26} style={{ marginBottom: 10 }} />
              <Skeleton w="100%" h={28} radius={4} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Sparkline({ values, color = T.accent }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1)
  const w = 80, h = 28
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * h}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={points} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
      <polyline points={`0,${h} ${points} ${w},${h}`} stroke="none" fill={color} opacity="0.08" />
    </svg>
  )
}

function CandidatureTimeline({ status }: { status: string }) {
  const steps = [
    { key: 'pending', label: 'Envoyé', icon: <Send size={12} /> },
    { key: 'read', label: 'Lu', icon: <Eye size={12} /> },
    { key: 'validating', label: 'Validation', icon: <Clock size={12} /> },
    { key: 'validated', label: 'Payé', icon: <CreditCard size={12} /> },
  ]
  const activeIndex =
    status === 'paid' ? 3 :
    status === 'validated' ? 2 :
    status === 'pending' ? 1 :
    0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 280 }}>
      {steps.map((step, i) => (
        <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i <= activeIndex ? T.accent : T.border, color: i <= activeIndex ? 'white' : T.muted, boxShadow: i === activeIndex ? `0 0 0 3px ${T.accentSoft}` : 'none', transition: 'all 0.3s', flexShrink: 0 }}>
              {i < activeIndex ? <CheckCircle size={12} /> : step.icon}
            </div>
            <span style={{ fontFamily: T.sans, fontSize: 10, color: i <= activeIndex ? T.accent : T.muted, fontWeight: i === activeIndex ? 600 : 400, whiteSpace: 'nowrap' }}>{step.label}</span>
          </div>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: i < activeIndex ? T.accent : T.border, margin: '0 4px', marginBottom: 18, borderRadius: 2 }} />}
        </div>
      ))}
    </div>
  )
}

function MiniCalendar() {
  const today = new Date()
  const year = today.getFullYear(); const month = today.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1
  const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  const highlightedDays = [10, 17, 24]
  const cells: (number | null)[] = []
  for (let i = 0; i < adjustedFirst; i++) cells.push(null)
  for (let i = 1; i <= daysInMonth; i++) cells.push(i)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, color: T.ink }}>{MONTHS[month]} {year}</p>
        <span style={{ fontFamily: T.sans, fontSize: 10, color: T.muted }}>Semaine en cours</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
        {DAYS.map((d, i) => <div key={i} style={{ textAlign: 'center', fontFamily: T.sans, fontSize: 10, color: T.muted, fontWeight: 600, padding: '2px 0' }}>{d}</div>)}
        {cells.map((day, i) => (
          <div key={i} style={{ textAlign: 'center', fontFamily: T.sans, fontSize: 11, padding: '4px 2px', borderRadius: 6, background: day === today.getDate() ? T.accent : highlightedDays.includes(day!) ? T.accentSoft : 'transparent', color: day === today.getDate() ? 'white' : highlightedDays.includes(day!) ? T.accent : day ? T.body : 'transparent', fontWeight: day === today.getDate() || highlightedDays.includes(day!) ? 700 : 400 }}>
            {day || ''}
          </div>
        ))}
      </div>
      <div style={{ background: T.bg, borderRadius: 10, padding: '9px 11px', marginTop: 8 }}>
        <p style={{ fontFamily: T.sans, fontSize: 11, color: T.body, lineHeight: 1.5 }}>
          <span style={{ fontWeight: 600, color: T.ink }}>Prochain déballage :</span> Samedi à Roquevaire (4.2 km)
        </p>
      </div>
    </div>
  )
}

function EmptyState({ onAction }: { onAction: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ textAlign: 'center', padding: '40px 24px' }}>
      <div style={{ width: 64, height: 64, background: T.accentSoft, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Rocket size={28} style={{ color: T.accent }} />
      </div>
      <p style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Lancez-vous !</p>
      <p style={{ fontFamily: T.sans, fontSize: 13, color: T.body, lineHeight: 1.6, marginBottom: 20, maxWidth: 280, margin: '0 auto 20px' }}>
        Vous n'avez encore envoyé aucune candidature. Des dizaines de marchés vous attendent en PACA.
      </p>
      <button onClick={onAction}
        style={{ background: T.accent, color: 'white', border: 'none', borderRadius: 100, padding: '12px 24px', fontFamily: T.sans, fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: T.shadowFab }}>
        <Map size={14} /> Voir les marchés disponibles
      </button>
      <p style={{ fontFamily: T.sans, fontSize: 11, color: T.muted }}>Gratuit · Réponse sous 48h · Sans engagement</p>
    </motion.div>
  )
}

function NotificationsDropdown({ candidaturesAPayer, onClose, onAction }: { candidaturesAPayer: any[]; onClose: () => void; onAction: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute', top: 'calc(100% + 8px)', right: 0,
        background: T.card, borderRadius: T.radiusSm,
        boxShadow: '0 16px 40px rgba(15,23,42,0.14)',
        width: 320, maxWidth: 'calc(100vw - 32px)', zIndex: 100, overflow: 'hidden'
      }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.ink }}>Notifications</p>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
          <X size={14} style={{ color: T.muted }} />
        </button>
      </div>
      {candidaturesAPayer.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
          <Bell size={28} style={{ color: T.border, margin: '0 auto 10px' }} />
          <p style={{ fontFamily: T.sans, fontSize: 12, color: T.muted }}>Aucune notification pour le moment</p>
        </div>
      ) : (
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {candidaturesAPayer.map((c, i) => (
            <div key={i} onClick={onAction}
              style={{ padding: '14px 18px', borderBottom: i < candidaturesAPayer.length - 1 ? `1px solid ${T.border}` : 'none', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg}
              onMouseLeave={e => e.currentTarget.style.background = T.card}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: T.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle size={15} style={{ color: T.accent }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 2 }}>Candidature acceptée</p>
                <p style={{ fontFamily: T.sans, fontSize: 11, color: T.body, lineHeight: 1.5 }}><strong style={{ color: T.ink }}>{c.events?.title}</strong> — paiement à finaliser</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function DashboardContent() {
  const [profile, setProfile] = useState<any>(null)
  const [nearbyEvents, setNearbyEvents] = useState<any[]>([])
  const [candidatures, setCandidatures] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [upgradingPro, setUpgradingPro] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const isMobile = useIsMobile()

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(profileData)
    if (profileData?.role === 'organisateur') { router.push('/dashboard/organisateur'); return }

    const { data: eventsData } = await supabase.from('events').select('*').eq('status', 'published').order('start_date', { ascending: true }).limit(5)
    setNearbyEvents(eventsData || [])
    const { data: apps } = await supabase.from('applications').select(`*, events:event_id(title, start_date, location_name, price_per_spot, organisateur_id, organisateur:organisateur_id(full_name))`).eq('exposant_id', user.id).order('created_at', { ascending: false })
    setCandidatures(apps || [])
    const { data: expData } = await supabase.from('exposant_data').select('plan, is_verified, kbis_url, assurance_url').eq('user_id', user.id).single()
    setStats({
      total: apps?.length || 0,
      validated: apps?.filter((a: any) => a.status === 'validated').length || 0,
      paid: apps?.filter((a: any) => a.status === 'paid').length || 0,
      pending: apps?.filter((a: any) => a.status === 'pending').length || 0,
      plan: expData?.plan || 'gratuit',
      isVerified: expData?.is_verified || false,
      kbisUrl: expData?.kbis_url || null,
      rcproUrl: expData?.assurance_url || null,
    })
    setLoading(false)

    if (profileData?.role !== 'organisateur' && !profileData?.onboarding_completed) {
      setTimeout(() => setShowOnboarding(true), 600)
    }
  }

  useEffect(() => { loadData() }, [searchParams])

  if (loading) return <DashboardSkeleton isMobile={isMobile} />

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const candidaturesCeMois = candidatures.filter(c => new Date(c.created_at) >= monthStart).length
  const isPro = profile?.plan === 'pro'

  const handleUpgradePro = async () => {
    setUpgradingPro(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const res = await fetch('/api/create-pro-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: profile?.email || '' })
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      if (url) window.location.href = url
    } catch (err: any) { alert('Erreur : ' + err.message) }
    setUpgradingPro(false)
  }

  const candidaturesAPayer = candidatures.filter(c => c.status === 'validated')

  const handlePayer = async (candidature: any) => {
    setPayingId(candidature.id)
    try {
      const res = await fetch('/api/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidatureId: candidature.id, eventTitle: candidature.events?.title || '', exposantEmail: profile?.email || '', exposantNom: profile?.full_name || '' }) })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      if (url) window.location.href = url
    } catch (err: any) { alert('Erreur paiement : ' + err.message) }
    setPayingId(null)
  }

  const isNewUser = candidatures.length === 0 && nearbyEvents.length === 0 && !stats.isVerified

  if (isNewUser) return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, fontFamily: T.sans }}>
      <Sidebar profile={profile} />
      <div style={{ marginLeft: isMobile ? 0 : 220, flex: 1, minWidth: 0 }}>
        <header style={{ background: 'rgba(248,249,250,0.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}`, padding: isMobile ? '0 16px 0 60px' : '0 28px', height: 56, display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.ink, display: 'flex', alignItems: 'center', gap: 6 }}>
            Salut {profile?.full_name?.split(' ')[0]} <Hand size={14} style={{ color: T.accent }} />
          </p>
        </header>
        <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <main style={{ padding: isMobile ? '24px 16px' : '44px 28px', maxWidth: 600, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div style={{ background: 'linear-gradient(135deg, #12151A, #232838)', borderRadius: T.radius, padding: isMobile ? '28px 24px' : '36px', marginBottom: 22, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle, rgba(129,140,248,0.3) 0%, transparent 70%)' }} />
              <div style={{ width: 56, height: 56, background: 'rgba(129,140,248,0.18)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', position: 'relative' }}>
                <Sparkles size={28} style={{ color: '#818CF8' }} />
              </div>
              <h1 style={{ fontFamily: T.sans, fontSize: isMobile ? 21 : 25, fontWeight: 800, color: 'white', marginBottom: 10, position: 'relative', letterSpacing: '-0.01em' }}>Bienvenue sur PulseMarket !</h1>
              <p style={{ fontFamily: T.sans, fontSize: 14, color: '#9AA1AB', lineHeight: 1.7, position: 'relative' }}>Votre plateforme pour trouver et gérer vos participations aux marchés en PACA.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
              {[
                { label: 'Complétez votre profil exposant', sub: 'Ajoutez votre SIREN, Kbis et RC Pro', done: stats.isVerified, path: '/dashboard/profil', cta: 'Compléter mon profil', icon: <FileCheck size={18} style={{ color: T.accent }} /> },
                { label: 'Explorez les marchés disponibles', sub: "Des dizaines d'événements en PACA", done: false, path: '/dashboard/evenements', cta: 'Voir les marchés', icon: <Map size={18} style={{ color: T.accent }} /> },
                { label: 'Envoyez votre première candidature', sub: 'Gratuit · Réponse sous 48h', done: false, path: '/dashboard/evenements', cta: 'Postuler maintenant', icon: <Rocket size={18} style={{ color: T.accent }} /> },
              ].map((step, i) => (
                <div key={i} style={{ background: T.card, borderRadius: T.radiusSm, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: T.shadowCard }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: step.done ? T.successSoft : T.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {step.done ? <CheckCircle size={18} style={{ color: T.success }} /> : step.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 2 }}>{step.label}</p>
                    <p style={{ fontFamily: T.sans, fontSize: 11, color: T.muted }}>{step.sub}</p>
                  </div>
                  {!step.done && (
                    <button onClick={() => router.push(step.path)}
                      style={{ background: T.accent, color: 'white', border: 'none', borderRadius: 100, padding: '8px 15px', fontFamily: T.sans, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {step.cta}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontFamily: T.sans, fontSize: 12, color: T.muted }}>
              Besoin d'aide ? <a href="mailto:contact@pulse-market.fr" style={{ color: T.accent, textDecoration: 'none' }}>contact@pulse-market.fr</a>
            </p>
          </motion.div>
        </main>
      </div>
      {showOnboarding && <OnboardingTour onComplete={() => setShowOnboarding(false)} />}
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, fontFamily: T.sans }}>
      <Sidebar profile={profile} />
      <div className="dash-wrap" style={{ marginLeft: isMobile ? 0 : 220, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="dash-header" style={{ background: 'rgba(248,249,250,0.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}`, padding: isMobile ? '0 16px 0 60px' : '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.ink, display: 'flex', alignItems: 'center', gap: 6 }}>
              Salut {profile?.full_name?.split(' ')[0]} <Hand size={13} style={{ color: T.accent }} />
            </p>
            <p style={{ fontFamily: T.sans, fontSize: 11, color: T.muted }}>Tableau de bord — Exposant</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16 }}>
            {!isMobile && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: T.sans, fontSize: 12, color: T.body }}><MapPin size={12} style={{ color: T.accent }} /> Bouches-du-Rhône</div>}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowNotif(!showNotif)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 9, padding: '6px 9px', cursor: 'pointer', boxShadow: T.shadowCard }}>
                <Bell size={14} style={{ color: T.body }} />
              </button>
              {candidaturesAPayer.length > 0 && <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: '#DC2626', borderRadius: '50%', fontFamily: T.sans, fontSize: 9, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{candidaturesAPayer.length}</span>}
              {showNotif && <NotificationsDropdown candidaturesAPayer={candidaturesAPayer} onClose={() => setShowNotif(false)} onAction={() => { setShowNotif(false); document.querySelector('[data-tour="suivi"]')?.scrollIntoView({ behavior: 'smooth' }) }} />}
            </div>
          </div>
        </header>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } } .hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>

        <main className="dash-main" style={{ padding: isMobile ? '18px 14px' : '26px 28px', flex: 1 }}>
          <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {!isPro && candidaturesCeMois >= 1 && (
              <motion.div variants={fadeUp}>
                <div style={{ background: 'linear-gradient(135deg, #12151A, #232838)', borderRadius: T.radiusSm, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertCircle size={18} style={{ color: '#FBBF24', flexShrink: 0 }} />
                    <div>
                      <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 2 }}>Limite mensuelle atteinte</p>
                      <p style={{ fontFamily: T.sans, fontSize: 11, color: '#9AA1AB' }}>Vous avez utilisé votre 1 candidature gratuite ce mois — passez Pro pour candidater sans limite.</p>
                    </div>
                  </div>
                  <button onClick={handleUpgradePro} disabled={upgradingPro}
                    style={{ background: T.accent, color: 'white', border: 'none', borderRadius: 100, padding: '9px 18px', fontFamily: T.sans, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, opacity: upgradingPro ? 0.7 : 1, boxShadow: T.shadowFab }}>
                    {upgradingPro ? <><Loader size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> Chargement...</> : <><Zap size={12} /> Passer Pro — 20€/mois</>}
                  </button>
                </div>
              </motion.div>
            )}

            {candidaturesAPayer.length > 0 && (
              <motion.div variants={fadeUp}>
                {candidaturesAPayer.map(c => (
                  <div key={c.id} style={{ background: `linear-gradient(135deg, ${T.accent}, #7C3AED)`, borderRadius: T.radiusSm, padding: isMobile ? '16px' : '18px 22px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, boxShadow: T.shadowFab }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.15)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CheckCircle size={20} style={{ color: 'white' }} />
                      </div>
                      <div>
                        <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 2 }}>Candidature acceptée !</p>
                        <p style={{ fontFamily: T.sans, fontSize: 11, color: 'rgba(255,255,255,0.8)' }}><strong style={{ color: 'white' }}>{c.events?.title}</strong> — payez pour confirmer.</p>
                      </div>
                    </div>
                    <button onClick={() => handlePayer(c)} disabled={payingId === c.id}
                      style={{ background: 'white', color: T.accent, border: 'none', borderRadius: 100, padding: '10px 20px', fontFamily: T.sans, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
                      {payingId === c.id ? <><Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Chargement...</> : <><CreditCard size={14} /> Payer {(c.events?.price_per_spot || 0) + 2} €</>}
                    </button>
                  </div>
                ))}
              </motion.div>
            )}

            <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Candidatures', value: stats.total || 0, spark: [0, 1, 1, 2, 1, 2, stats.total || 0], color: T.accent },
                { label: 'Validées', value: stats.validated || 0, spark: [0, 0, 1, 1, 1, 1, stats.validated || 0], color: T.success },
                { label: 'En attente', value: stats.pending || 0, spark: [0, 1, 0, 1, 1, 0, stats.pending || 0], color: T.warning },
                { label: 'Places payées', value: stats.paid || 0, spark: [0, 0, 0, 1, 1, 1, stats.paid || 0], color: '#0EA5E9' },
              ].map((s, i) => (
                <div key={i} style={{ background: T.card, borderRadius: T.radiusSm, padding: '15px 17px', boxShadow: T.shadowCard }}>
                  <p style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 9 }}>{s.label}</p>
                  <p style={{ fontFamily: T.sans, fontSize: 26, fontWeight: 800, color: T.ink, marginBottom: 6, letterSpacing: '-0.01em' }}>{s.value}</p>
                  <Sparkline values={s.spark} color={s.color} />
                </div>
              ))}
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap: 18 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
                <motion.div data-tour="marches" variants={fadeUp} style={{ background: T.card, borderRadius: T.radiusSm, overflow: 'hidden', boxShadow: T.shadowCard }}>
                  <div style={{ padding: '15px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.ink }}>Marchés à proximité</p>
                    <button onClick={() => router.push('/dashboard/evenements')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: T.sans, fontSize: 12, color: T.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Voir tout <ArrowUpRight size={13} />
                    </button>
                  </div>
                  {nearbyEvents.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: T.muted, fontFamily: T.sans, fontSize: 13 }}>Aucun événement disponible</div>
                  ) : (
                    <div className="hide-scrollbar" style={{ overflowX: 'auto', display: 'flex', gap: 12, padding: '15px 18px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                      {nearbyEvents.filter(event => !candidatures.find(c => c.event_id === event.id && c.status === 'paid')).slice(0, 5).map((event: any, i: number) => {
                        const gradients = [`linear-gradient(135deg, ${T.accent}, #7C3AED)`, 'linear-gradient(135deg, #0EA5E9, #4F46E5)', 'linear-gradient(135deg, #16A34A, #0EA5E9)', 'linear-gradient(135deg, #EA580C, #DC2626)', 'linear-gradient(135deg, #7C3AED, #EC4899)']
                        const isBlocked = !isPro && candidaturesCeMois >= 1
                        return (
                          <div key={event.id}
                            onClick={() => {
                              if (isBlocked) { alert('Limite mensuelle atteinte — passez en Pro pour candidater sans limite.'); return }
                              router.push(`/dashboard/candidature?eventId=${event.id}&eventName=${encodeURIComponent(event.title)}&eventDate=${encodeURIComponent(new Date(event.start_date).toLocaleDateString('fr-FR'))}&eventLocation=${encodeURIComponent(event.location_name || '')}`)
                            }}
                            style={{ flexShrink: 0, width: 178, borderRadius: T.radiusSm, overflow: 'hidden', cursor: isBlocked ? 'not-allowed' : 'pointer', background: T.card, opacity: isBlocked ? 0.6 : 1, position: 'relative', boxShadow: T.shadowCard, transition: 'transform 0.25s ease, box-shadow 0.25s ease' }}
                            onMouseEnter={e => { if (!isBlocked) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = T.shadowCardHover } }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = T.shadowCard }}>
                            {isBlocked && (
                              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.5)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: T.radiusSm }}>
                                <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, color: T.accent, background: 'white', padding: '4px 9px', borderRadius: 100, boxShadow: T.shadowCard, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <Lock size={10} /> Pro
                                </span>
                              </div>
                            )}
                            <div style={{ height: 100, position: 'relative', overflow: 'hidden', background: gradients[i % gradients.length] }}>
                              {event.image_url && <img src={event.image_url} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,12,16,0.5) 0%, transparent 60%)' }} />
                              <div style={{ position: 'absolute', bottom: 7, left: 9, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <MapPin size={9} style={{ color: 'white' }} /><span style={{ fontFamily: T.sans, fontSize: 9, color: 'white', fontWeight: 500 }}>{event.location_name?.split(',')[0]}</span>
                              </div>
                            </div>
                            <div style={{ padding: '11px 13px' }}>
                              <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</p>
                              <p style={{ fontFamily: T.sans, fontSize: 11, color: T.muted, marginBottom: 6 }}>{new Date(event.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 800, color: T.accent }}>{event.price_per_spot === 0 ? 'Gratuit' : `${event.price_per_spot}€`}</span>
                                <span style={{ fontFamily: T.sans, fontSize: 10, color: T.muted }}>{event.available_spots} places</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>

                <motion.div data-tour="suivi" variants={fadeUp} style={{ background: T.card, borderRadius: T.radiusSm, overflow: 'hidden', boxShadow: T.shadowCard }}>
                  <div style={{ padding: '15px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.ink }}>Suivi de mes dossiers</p>
                    <span style={{ fontFamily: T.sans, fontSize: 11, color: T.muted }}>{candidatures.length} dossier(s)</span>
                  </div>
                  {candidatures.length === 0 ? (
                    <EmptyState onAction={() => router.push('/dashboard/evenements')} />
                  ) : (
                    <div style={{ padding: '17px 18px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {candidatures.slice(0, 4).map((c) => (
                        <div key={c.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: T.body }}>{c.events?.title || 'Événement'}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              {c.status === 'validated' && (
                                <button onClick={() => handlePayer(c)} disabled={payingId === c.id}
                                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: T.accent, color: 'white', border: 'none', borderRadius: 100, padding: '4px 11px', fontFamily: T.sans, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                  <CreditCard size={10} /> Payer
                                </button>
                              )}
                              <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 600, color: c.status === 'validated' ? T.success : c.status === 'paid' ? T.accent : T.warning, background: c.status === 'validated' ? T.successSoft : c.status === 'paid' ? T.accentSoft : T.warningSoft, padding: '3px 9px', borderRadius: 100 }}>
                                {c.status === 'validated' ? 'Accepté' : c.status === 'paid' ? 'Confirmé' : 'En attente'}
                              </span>
                            </div>
                          </div>
                          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <CandidatureTimeline status={c.status} />
                          </div>
                          {c.status === 'paid' && (
                            <div style={{ marginTop: 10 }}>
                              <button onClick={() => downloadAOT({
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
                              })}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: T.ink, color: 'white', border: 'none', borderRadius: 100, padding: '9px 12px', fontFamily: T.sans, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                <FileText size={12} /> Télécharger mon AOT
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>

              <motion.div variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                <div style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)', borderRadius: T.radiusSm, padding: '15px 17px', cursor: 'pointer', boxShadow: '0 6px 18px rgba(239,68,68,0.18)' }} onClick={() => router.push('/dashboard/boost')}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 11 }}>
                    <div style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.2)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <TrendingUp size={15} style={{ color: 'white' }} />
                    </div>
                    <div>
                      <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 2 }}>Booster ma visibilité</p>
                      <p style={{ fontFamily: T.sans, fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>Apparaissez en tête sur Whatmarket — 20€</p>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 100, padding: '9px 12px', textAlign: 'center' }}>
                    <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, color: 'white' }}>Mettre ma pub en ligne →</span>
                  </div>
                </div>

                {!isPro && (
                  <div data-tour="pro" style={{ background: T.ink, borderRadius: T.radiusSm, padding: '15px 17px' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 11 }}>
                      <Zap size={14} style={{ color: '#FBBF24', flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 2 }}>Passez en Pro — 20€/mois</p>
                        <p style={{ fontFamily: T.sans, fontSize: 11, color: '#9AA1AB', lineHeight: 1.5 }}>Candidatures illimitées, alertes, événements exclusifs</p>
                      </div>
                    </div>
                    <button onClick={handleUpgradePro} disabled={upgradingPro}
                      style={{ width: '100%', background: T.accent, color: 'white', border: 'none', borderRadius: 100, padding: '9px 0', fontFamily: T.sans, fontSize: 12, fontWeight: 700, cursor: upgradingPro ? 'not-allowed' : 'pointer', opacity: upgradingPro ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {upgradingPro ? <><Loader size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> Chargement...</> : <><Zap size={12} /> Passer Pro — 20€/mois →</>}
                    </button>
                  </div>
                )}

                <div style={{ background: T.card, borderRadius: T.radiusSm, padding: '15px 17px', boxShadow: T.shadowCard }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
                    <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mon plan</p>
                    <Star size={14} style={{ color: isPro ? '#FBBF24' : T.border, fill: isPro ? '#FBBF24' : 'none' }} />
                  </div>
                  <p style={{ fontFamily: T.sans, fontSize: 22, fontWeight: 800, color: T.ink, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '-0.01em' }}>
                    {isPro && <Star size={18} style={{ color: '#FBBF24', fill: '#FBBF24' }} />}
                    {isPro ? 'Pro' : 'Gratuit'}
                  </p>
                  <p style={{ fontFamily: T.sans, fontSize: 12, color: T.muted }}>
                    {isPro ? 'Candidatures illimitées' : `${candidaturesCeMois}/1 candidature ce mois`}
                  </p>
                  {!isPro && (
                    <button onClick={handleUpgradePro} disabled={upgradingPro}
                      style={{ width: '100%', marginTop: 11, background: T.accentSoft, color: T.accent, border: 'none', borderRadius: 100, padding: '8px 0', fontFamily: T.sans, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Upgrader →
                    </button>
                  )}
                </div>

                {!isMobile && (
                  <div style={{ background: T.card, borderRadius: T.radiusSm, padding: '15px 17px', boxShadow: T.shadowCard }}>
                    <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Calendrier</p>
                    <MiniCalendar />
                  </div>
                )}

                <div data-tour="dossier" style={{ background: T.card, borderRadius: T.radiusSm, padding: '15px 17px', boxShadow: T.shadowCard }}>
                  <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Mon dossier exposant</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 13 }}>
                    {[
                      { label: 'Extrait Kbis', status: !!stats.kbisUrl },
                      { label: 'Attestation RC Pro', status: !!stats.rcproUrl },
                      { label: 'Vérification SIREN', status: stats.isVerified },
                    ].map((doc, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: T.sans, fontSize: 12, color: T.body }}>{doc.label}</span>
                        <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, color: doc.status ? T.success : T.warning, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          {doc.status ? <><CheckCircle size={11} /> Fourni</> : <><Clock size={11} /> Manquant</>}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => router.push('/dashboard/profil')} style={{ width: '100%', background: T.accent, color: 'white', border: 'none', borderRadius: 100, padding: '10px 0', fontFamily: T.sans, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 8 }}>
                    <Camera size={14} /> Numériser un document
                  </button>
                  <button onClick={() => router.push('/dashboard/profil')} style={{ width: '100%', background: T.bg, border: 'none', borderRadius: 100, padding: '9px 0', fontFamily: T.sans, fontSize: 12, fontWeight: 500, color: T.body, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    Gérer mon dossier <ChevronRight size={13} />
                  </button>
                </div>

                {stats.isVerified && (
                  <div style={{ background: T.successSoft, borderRadius: T.radiusSm, padding: '13px 15px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Shield size={15} style={{ color: T.success, flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, color: '#15803D', marginBottom: 2 }}>Dossier certifié INSEE</p>
                      <p style={{ fontFamily: T.sans, fontSize: 11, color: '#16A34A', lineHeight: 1.5 }}>SIREN vérifié — badge visible par tous les organisateurs.</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </main>
      </div>

      {showOnboarding && <OnboardingTour onComplete={() => setShowOnboarding(false)} />}
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: `2px solid ${T.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}