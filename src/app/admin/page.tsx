'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Building2, Users, Mail, Loader, CheckCircle,
  XCircle, Search, Send, AlertCircle, RefreshCw
} from 'lucide-react'

const BRAND = '#4F46E5'

type Tab = 'dashboard' | 'mairies' | 'exposants' | 'bulk-email'

// ─── Helper fetch authentifié admin ───
function useAdminFetch() {
  const supabase = createClient()
  return useCallback(async (url: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Session expirée')
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erreur requête')
    return data
  }, [supabase])
}

// ═══════════════════════════════════════════════════════════
// GUARD — vérifie is_admin avant d'afficher quoi que ce soit
// ═══════════════════════════════════════════════════════════
function useAdminGuard() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'denied'>('loading')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!profile?.is_admin) { setStatus('denied'); return }
      setStatus('ok')
    }
    check()
  }, [])

  return status
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
function DashboardTab() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const adminFetch = useAdminFetch()

  useEffect(() => {
    adminFetch('/api/admin/stats').then(setStats).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader size={20} style={{ animation: 'spin 0.8s linear infinite', color: BRAND }} /></div>
  if (!stats) return <p style={{ color: '#94A3B8', fontSize: 13 }}>Erreur de chargement</p>

  const cards = [
    { label: 'Mairies totales', value: stats.mairies.total, sub: `${stats.mairies.pending} en attente`, accent: BRAND },
    { label: 'Mairies approuvées', value: stats.mairies.approved, sub: `${stats.mairies.rejected} refusées`, accent: '#16A34A' },
    { label: 'Exposants', value: stats.exposants.total, sub: `${stats.exposants.pro} Pro / ${stats.exposants.free} Free`, accent: '#7C3AED' },
    { label: 'MRR estimé', value: `${stats.mrrEstimate} €`, sub: 'Abonnements Pro exposants', accent: '#F59E0B' },
    { label: 'Inscriptions 30j', value: stats.signupsLast30Days, sub: 'Tous rôles confondus', accent: '#06B6D4' },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.accent }} />
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', marginBottom: 8 }}>{c.label}</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>{c.value}</p>
            <p style={{ fontSize: 11, color: '#94A3B8' }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {stats.mairies.pending > 0 && (
        <div style={{ marginTop: 20, background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={16} style={{ color: BRAND, flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#4338CA' }}>
            <strong>{stats.mairies.pending}</strong> mairie(s) en attente de validation — onglet "Mairies".
          </p>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MAIRIES
// ═══════════════════════════════════════════════════════════
function MairiesTab() {
  const [mairies, setMairies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [actioning, setActioning] = useState<string | null>(null)
  const adminFetch = useAdminFetch()

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (search) params.set('search', search)
    try {
      const data = await adminFetch(`/api/admin/mairies?${params.toString()}`)
      setMairies(data.mairies)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [statusFilter, search])

  useEffect(() => { load() }, [statusFilter])

  const handleAction = async (userId: string, action: 'approve' | 'reject') => {
    setActioning(userId)
    try {
      await adminFetch('/api/admin/approve-mairie', { method: 'POST', body: JSON.stringify({ userId, action }) })
      await load()
    } catch (e: any) {
      alert('Erreur : ' + e.message)
    }
    setActioning(null)
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: '#FEF3C7', color: '#B45309', label: 'En attente' },
      approved: { bg: '#DCFCE7', color: '#15803D', label: 'Approuvée' },
      rejected: { bg: '#FEE2E2', color: '#DC2626', label: 'Refusée' },
    }
    const s = map[status] || map.pending
    return <span style={{ fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, padding: '3px 9px', borderRadius: 100 }}>{s.label}</span>
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Rechercher une organisation..."
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {['', 'pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: '9px 14px', borderRadius: 9, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: statusFilter === s ? BRAND : '#F1F5F9', color: statusFilter === s ? 'white' : '#64748B' }}>
            {s === '' ? 'Tous' : s === 'pending' ? 'En attente' : s === 'approved' ? 'Approuvées' : 'Refusées'}
          </button>
        ))}
        <button onClick={load} style={{ padding: '9px', borderRadius: 9, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>
          <RefreshCw size={14} style={{ color: '#64748B' }} />
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader size={18} style={{ animation: 'spin 0.8s linear infinite', color: BRAND }} /></div>
      ) : mairies.length === 0 ? (
        <p style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 13 }}>Aucune mairie trouvée</p>
      ) : (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
          {mairies.map((m, i) => (
            <div key={m.id} style={{ padding: '14px 18px', borderBottom: i < mairies.length - 1 ? '1px solid #F1F5F9' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{m.organisation_name || '—'}</p>
                  {statusBadge(m.organisateur_status)}
                </div>
                <p style={{ fontSize: 12, color: '#94A3B8' }}>{m.email} · SIRET {m.organisation_siret || '—'}</p>
              </div>
              {m.organisateur_status === 'pending' && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => handleAction(m.id, 'approve')} disabled={actioning === m.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#16A34A', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: actioning === m.id ? 0.6 : 1 }}>
                    <CheckCircle size={13} /> Approuver
                  </button>
                  <button onClick={() => handleAction(m.id, 'reject')} disabled={actioning === m.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: actioning === m.id ? 0.6 : 1 }}>
                    <XCircle size={13} /> Refuser
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// EXPOSANTS
// ═══════════════════════════════════════════════════════════
function ExposantsTab() {
  const [exposants, setExposants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [planFilter, setPlanFilter] = useState('')
  const [search, setSearch] = useState('')
  const adminFetch = useAdminFetch()

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (planFilter) params.set('plan', planFilter)
    if (search) params.set('search', search)
    try {
      const data = await adminFetch(`/api/admin/exposants?${params.toString()}`)
      setExposants(data.exposants)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [planFilter, search])

  useEffect(() => { load() }, [planFilter])

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Rechercher un exposant..."
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {[{ v: '', l: 'Tous' }, { v: 'pro', l: 'Pro' }, { v: 'free', l: 'Free' }].map(f => (
          <button key={f.v} onClick={() => setPlanFilter(f.v)}
            style={{ padding: '9px 14px', borderRadius: 9, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: planFilter === f.v ? BRAND : '#F1F5F9', color: planFilter === f.v ? 'white' : '#64748B' }}>
            {f.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader size={18} style={{ animation: 'spin 0.8s linear infinite', color: BRAND }} /></div>
      ) : exposants.length === 0 ? (
        <p style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 13 }}>Aucun exposant trouvé</p>
      ) : (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
          {exposants.map((e, i) => (
            <div key={e.id} style={{ padding: '14px 18px', borderBottom: i < exposants.length - 1 ? '1px solid #F1F5F9' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{e.full_name || '—'}</p>
                  {e.plan === 'pro' && <span style={{ fontSize: 10, fontWeight: 700, background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: 100 }}>PRO</span>}
                </div>
                <p style={{ fontSize: 12, color: '#94A3B8' }}>{e.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// BULK EMAIL
// ═══════════════════════════════════════════════════════════
function BulkEmailTab() {
  const [segment, setSegment] = useState('mairies_all')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const adminFetch = useAdminFetch()

  const segments = [
    { v: 'mairies_all', l: 'Toutes les mairies' },
    { v: 'mairies_pending', l: 'Mairies en attente' },
    { v: 'mairies_approved', l: 'Mairies approuvées' },
    { v: 'exposants_all', l: 'Tous les exposants' },
    { v: 'exposants_pro', l: 'Exposants Pro' },
    { v: 'exposants_free', l: 'Exposants Free' },
  ]

  const send = async () => {
    if (!subject || !message) { setResult({ type: 'error', text: 'Sujet et message requis' }); return }
    if (!confirm(`Envoyer cet email à "${segments.find(s => s.v === segment)?.l}" ?`)) return
    setSending(true)
    setResult(null)
    try {
      const data = await adminFetch('/api/admin/bulk-email', { method: 'POST', body: JSON.stringify({ segment, subject, message }) })
      setResult({ type: 'success', text: `${data.sent}/${data.total} email(s) envoyé(s)${data.failed > 0 ? `, ${data.failed} échec(s)` : ''}` })
      setSubject(''); setMessage('')
    } catch (e: any) {
      setResult({ type: 'error', text: e.message })
    }
    setSending(false)
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Destinataires</label>
        <select value={segment} onChange={e => setSegment(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13, outline: 'none' }}>
          {segments.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sujet</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Nouveauté PulseMarket"
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Message</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={8} placeholder="Votre message... (les sauts de ligne doubles créent des paragraphes)"
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
      </div>

      {result && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13, background: result.type === 'success' ? '#F0FDF4' : '#FEF2F2', color: result.type === 'success' ? '#15803D' : '#DC2626', border: `1px solid ${result.type === 'success' ? '#BBF7D0' : '#FECACA'}` }}>
          {result.text}
        </div>
      )}

      <button onClick={send} disabled={sending}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', background: BRAND, color: 'white', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.6 : 1 }}>
        {sending ? <><Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Envoi en cours...</> : <><Send size={14} /> Envoyer</>}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════
export default function AdminCRMPage() {
  const status = useAdminGuard()
  const [tab, setTab] = useState<Tab>('dashboard')

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
    { id: 'mairies' as Tab, label: 'Mairies', icon: <Building2 size={15} /> },
    { id: 'exposants' as Tab, label: 'Exposants', icon: <Users size={15} /> },
    { id: 'bulk-email' as Tab, label: 'Mail groupé', icon: <Mail size={15} /> },
  ]

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size={22} style={{ animation: 'spin 0.8s linear infinite', color: BRAND }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
        <AlertCircle size={28} style={{ color: '#DC2626' }} />
        <p style={{ fontSize: 14, color: '#0F172A', fontWeight: 600 }}>Accès non autorisé</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <header style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '16px 28px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: BRAND, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Admin</p>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>PulseMarket CRM</h1>
      </header>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 28px' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === t.id ? BRAND : 'transparent', color: tab === t.id ? 'white' : '#64748B' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {tab === 'dashboard' && <DashboardTab />}
            {tab === 'mairies' && <MairiesTab />}
            {tab === 'exposants' && <ExposantsTab />}
            {tab === 'bulk-email' && <BulkEmailTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}