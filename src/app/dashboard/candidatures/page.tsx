'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { openFacturePDF } from '@/lib/generateFacture'
import Sidebar from '@/components/Sidebar'
import {
  Search, CheckCircle, AlertCircle, Clock,
  XCircle, ChevronRight, X, Bell, MapPin,
  Shield, ThumbsUp, ThumbsDown, Plus, Calendar,
  Users, ArrowLeft, Zap, Ruler, User, ExternalLink,
  CreditCard, CheckSquare, Square, Loader, ScanLine,
  AlertTriangle, UserCheck, FileEdit, Trash2, Eye,
  Lock, ScanSearch
} from 'lucide-react'

const BRAND = '#4F46E5'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:   { label: 'En attente', color: '#F59E0B', bg: '#FFFBEB', icon: <Clock size={11} /> },
  validated: { label: 'Validé',     color: '#16A34A', bg: '#F0FDF4', icon: <CheckCircle size={11} /> },
  rejected:  { label: 'Refusé',     color: '#DC2626', bg: '#FEF2F2', icon: <XCircle size={11} /> },
  paid:      { label: 'Payé',       color: BRAND,    bg: '#EEF2FF', icon: <CreditCard size={11} /> },
}

const VERIF_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:         { label: 'En attente',           color: '#F59E0B', bg: '#FFFBEB', icon: <Clock size={9} /> },
  auto_verified:   { label: 'Vérifié',              color: '#16A34A', bg: '#F0FDF4', icon: <CheckCircle size={9} /> },
  manual_review:   { label: 'Revue requise',        color: '#EA580C', bg: '#FFF7ED', icon: <Eye size={9} /> },
  rejected:        { label: 'Rejeté',               color: '#DC2626', bg: '#FEF2F2', icon: <XCircle size={9} /> },
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

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: config.bg, color: config.color, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, border: `1px solid ${config.color}22` }}>
      {config.icon} {config.label}
    </span>
  )
}

function VerifBadge({ status }: { status: string }) {
  const config = VERIF_CONFIG[status] || VERIF_CONFIG.pending
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: config.bg, color: config.color, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100 }}>
      {config.icon} {config.label}
    </span>
  )
}

function DocBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: ok ? '#F0FDF4' : '#FEF2F2', color: ok ? '#16A34A' : '#DC2626', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 100 }}>
      {ok ? <CheckCircle size={9} /> : <AlertCircle size={9} />} {label}
    </span>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '?'
  const colors = [BRAND, '#16A34A', '#EA580C', '#0EA5E9', '#7C3AED', '#DC2626']
  const color = colors[(name?.length || 0) % colors.length] || BRAND
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1.5px solid ${color}30` }}>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{initials}</span>
    </div>
  )
}

function EventCover({ event }: { event: any }) {
  const gradients = ['linear-gradient(135deg, #4F46E5, #7C3AED)', 'linear-gradient(135deg, #0EA5E9, #4F46E5)', 'linear-gradient(135deg, #16A34A, #0EA5E9)', 'linear-gradient(135deg, #EA580C, #DC2626)', 'linear-gradient(135deg, #7C3AED, #EC4899)']
  return (
    <div style={{ height: 120, position: 'relative', overflow: 'hidden', borderRadius: '10px 10px 0 0' }}>
      {event.image_url ? <img src={event.image_url} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div style={{ height: '100%', background: gradients[(event.title?.length || 0) % gradients.length] }} />}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)' }} />
      {event.status === 'draft' && (
        <span style={{ position: 'absolute', top: 8, right: 8, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(15,23,42,0.85)', color: '#FBBF24', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, backdropFilter: 'blur(8px)' }}>
          <FileEdit size={9} /> BROUILLON
        </span>
      )}
      <div style={{ position: 'absolute', bottom: 8, left: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
        <MapPin size={10} style={{ color: 'white', opacity: 0.8 }} />
        <span style={{ fontSize: 10, color: 'white', fontWeight: 500, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>{event.location_name}</span>
      </div>
    </div>
  )
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
      style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100, background: 'white', borderRadius: 12, padding: '14px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 10, borderLeft: `3px solid ${type === 'success' ? '#16A34A' : '#DC2626'}`, minWidth: 280 }}>
      {type === 'success' ? <CheckCircle size={15} style={{ color: '#16A34A' }} /> : <XCircle size={15} style={{ color: '#DC2626' }} />}
      <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{message}</span>
    </motion.div>
  )
}

// ✅ Modal delete custom
function DeleteEventModal({ event, candidatureCount, onCancel, onConfirm }: { event: any; candidatureCount: number; onCancel: () => void; onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
      onClick={onCancel}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        style={{ background: 'white', borderRadius: 16, padding: 24, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width: 48, height: 48, background: '#FEF2F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Trash2 size={22} style={{ color: '#DC2626' }} />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', textAlign: 'center', marginBottom: 6 }}>Supprimer cet événement ?</h3>
        <p style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 18, lineHeight: 1.5 }}>
          <strong style={{ color: '#0F172A' }}>{event.title}</strong>
        </p>

        {candidatureCount > 0 && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={14} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#991B1B', marginBottom: 4 }}>{candidatureCount} candidature(s) associée(s)</p>
              <p style={{ fontSize: 11, color: '#B91C1C', lineHeight: 1.5 }}>
                Toutes les candidatures, paiements et données associées seront définitivement supprimés.
              </p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel}
            style={{ flex: 1, background: 'white', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={() => { setConfirming(true); onConfirm() }} disabled={confirming}
            style={{ flex: 2, background: '#DC2626', color: 'white', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {confirming ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Trash2 size={13} />}
            Supprimer définitivement
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Candidatures() {
  const [profile, setProfile] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [allCandidatures, setAllCandidatures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null)
  const [searchEvents, setSearchEvents] = useState('')
  const [searchCandidatures, setSearchCandidatures] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [verifFilter, setVerifFilter] = useState('all')
  const [eventTab, setEventTab] = useState<'published' | 'draft'>('published')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [slideOver, setSlideOver] = useState<any | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [eventCandidatures, setEventCandidatures] = useState<{ [key: string]: number }>({})
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [signedUrls, setSignedUrls] = useState<{ kbis?: string; assurance?: string }>({})
  const [signedUrlsLoading, setSignedUrlsLoading] = useState(false)
  const [verifyingDossier, setVerifyingDossier] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)

  const router = useRouter()
  const supabase = createClient()
  const isMobile = useIsMobile()

  const generateSignedUrls = async (exposantData: any) => {
    setSignedUrls({}); setSignedUrlsLoading(true)
    const urls: { kbis?: string; assurance?: string } = {}
    try {
      if (exposantData?.kbis_url) {
        const { data } = await supabase.storage.from('documents').createSignedUrl(exposantData.kbis_url, 300)
        if (data?.signedUrl) urls.kbis = data.signedUrl
      }
      if (exposantData?.assurance_url) {
        const { data } = await supabase.storage.from('documents').createSignedUrl(exposantData.assurance_url, 300)
        if (data?.signedUrl) urls.assurance = data.signedUrl
      }
    } catch (err) { console.error('Signed URL error:', err) }
    setSignedUrls(urls); setSignedUrlsLoading(false)
  }

  const openSlideOver = (c: any) => { setSlideOver(c); setRejectReason(''); setShowRejectInput(false); generateSignedUrls(c.exposant_data) }
  const closeSlideOver = () => { setSlideOver(null); setShowRejectInput(false); setRejectReason(''); setSignedUrls({}) }

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profileData?.role !== 'organisateur') { router.push('/dashboard'); return }
      setProfile(profileData)
      const { data: eventsData } = await supabase.from('events').select('*').eq('organisateur_id', user.id).order('start_date', { ascending: false })
      setEvents(eventsData || [])
      const eventIds = eventsData?.map((e: any) => e.id) || []
      if (eventIds.length > 0) {
        const { data: apps } = await supabase.from('applications')
          .select(`*, profiles:exposant_id(full_name, email, phone), events:event_id(title, start_date, location_name, price_per_spot)`)
          .in('event_id', eventIds).order('created_at', { ascending: false })
        const appsWithData = await Promise.all((apps || []).map(async (app: any) => {
          const { data: expData } = await supabase.from('exposant_data').select('*').eq('user_id', app.exposant_id).single()
          return { ...app, exposant_data: expData }
        }))
        setAllCandidatures(appsWithData)
        const counts: { [key: string]: number } = {}
        appsWithData.forEach((a: any) => { counts[a.event_id] = (counts[a.event_id] || 0) + 1 })
        setEventCandidatures(counts)
      }
      setLoading(false)
    }
    getData()
  }, [])

  const handleValidate = async (id: string) => {
    setUpdating(id)
    await supabase.from('applications').update({ status: 'validated' }).eq('id', id)
    setAllCandidatures(prev => prev.map(c => c.id === id ? { ...c, status: 'validated' } : c))
    if (slideOver?.id === id) setSlideOver((prev: any) => ({ ...prev, status: 'validated' }))
    const candidature = allCandidatures.find(c => c.id === id)

    if (candidature?.event_id) {
      await supabase.rpc('decrement_available_spots', { event_id: candidature.event_id })
      setEvents(prev => prev.map(e =>
        e.id === candidature.event_id
          ? { ...e, available_spots: Math.max((e.available_spots || 0) - 1, 0) }
          : e
      ))
    }

    if (candidature) {
      openFacturePDF({
        candidatureId: id, exposantNom: candidature.profiles?.full_name || '', exposantEmail: candidature.profiles?.email || '',
        exposantSiren: candidature.exposant_data?.siren, exposantBusinessName: candidature.exposant_data?.business_name,
        exposantAdresse: candidature.exposant_data?.description, eventTitle: candidature.events?.title || '',
        eventDate: candidature.events?.start_date ? new Date(candidature.events.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
        eventLocation: candidature.events?.location_name || '', mairieNom: profile?.organisation_name || profile?.full_name,
        redevanceAOT: candidature.events?.price_per_spot || 0, fraisPlateforme: 2,
      })
    }
    if (candidature?.profiles?.email) {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'candidature_validee',
          to: candidature.profiles.email,
          data: {
            exposantNom: candidature.profiles?.full_name || '',
            eventTitle: candidature.events?.title || '',
          }
        })
      })
    }
    setToast({ message: 'Dossier approuvé — email envoyé — facture générée', type: 'success' })
    setUpdating(null); setShowRejectInput(false)
  }

  // ✅ Reject avec motif sauvé en DB + envoyé par email
  // 🔧 FIX — si la candidature était déjà "validated" (place déjà décomptée
  // via decrement_available_spots), on la restitue avec increment_available_spots.
  // Avant ce fix, valider puis refuser une candidature faisait perdre une
  // place au marché pour toujours, sans jamais la récupérer.
  const handleReject = async (id: string) => {
    setUpdating(id)
    const reason = rejectReason.trim() || 'Dossier non retenu'
    const candidature = allCandidatures.find(c => c.id === id)

    await supabase.from('applications').update({
      status: 'rejected',
      rejection_reason: reason,
      rejected_at: new Date().toISOString(),
    }).eq('id', id)

    // ✅ Restitue la place si elle avait été décomptée
    if (candidature?.status === 'validated' && candidature?.event_id) {
      await supabase.rpc('increment_available_spots', { event_id: candidature.event_id })
      setEvents(prev => prev.map(e =>
        e.id === candidature.event_id
          ? { ...e, available_spots: (e.available_spots || 0) + 1 }
          : e
      ))
    }

    setAllCandidatures(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected', rejection_reason: reason } : c))
    if (slideOver?.id === id) setSlideOver((prev: any) => ({ ...prev, status: 'rejected', rejection_reason: reason }))

    // ✅ Email avec motif
    if (candidature?.profiles?.email) {
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'candidature_refusee',
            to: candidature.profiles.email,
            data: {
              exposantNom: candidature.profiles?.full_name || '',
              eventTitle: candidature.events?.title || '',
              motif: reason,
            }
          })
        })
      } catch (e) { console.error('Email error:', e) }
    }

    setToast({ message: 'Dossier refusé — exposant notifié', type: 'error' })
    setUpdating(null); setShowRejectInput(false); setRejectReason('')
  }

  const handleManualVerify = async (exposantId: string) => {
    setVerifyingDossier(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('exposant_data').update({
      verification_status: 'auto_verified',
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq('user_id', exposantId)
    setAllCandidatures(prev => prev.map(c =>
      c.exposant_id === exposantId
        ? { ...c, exposant_data: { ...c.exposant_data, verification_status: 'auto_verified', reviewed_by: user?.id } }
        : c
    ))
    if (slideOver?.exposant_id === exposantId) {
      setSlideOver((prev: any) => ({ ...prev, exposant_data: { ...prev.exposant_data, verification_status: 'auto_verified' } }))
    }
    setToast({ message: 'Dossier validé manuellement', type: 'success' })
    setVerifyingDossier(false)
  }

  const handleFlagReview = async (exposantId: string) => {
    await supabase.from('exposant_data').update({ verification_status: 'manual_review' }).eq('user_id', exposantId)
    setAllCandidatures(prev => prev.map(c =>
      c.exposant_id === exposantId
        ? { ...c, exposant_data: { ...c.exposant_data, verification_status: 'manual_review' } }
        : c
    ))
    if (slideOver?.exposant_id === exposantId) {
      setSlideOver((prev: any) => ({ ...prev, exposant_data: { ...prev.exposant_data, verification_status: 'manual_review' } }))
    }
    setToast({ message: 'Dossier marqué pour revue manuelle', type: 'error' })
  }

  // ✅ Delete event avec cascade
  const handleDeleteEvent = async () => {
    if (!deleteTarget) return
    try {
      // Cascade: supprimer applications d'abord
      await supabase.from('applications').delete().eq('event_id', deleteTarget.id)
      await supabase.from('events').delete().eq('id', deleteTarget.id)
      setEvents(prev => prev.filter(ev => ev.id !== deleteTarget.id))
      setAllCandidatures(prev => prev.filter(c => c.event_id !== deleteTarget.id))
      setToast({ message: 'Événement supprimé', type: 'success' })
    } catch (err: any) {
      setToast({ message: 'Erreur : ' + err.message, type: 'error' })
    }
    setDeleteTarget(null)
  }

  const handleBulkValidate = async () => { for (const id of selectedIds) await handleValidate(id); setSelectedIds([]) }
  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const formatShort = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  const publishedEvents = events.filter(e => e.status === 'published' || !e.status)
  const draftEvents = events.filter(e => e.status === 'draft')
  const eventsByTab = eventTab === 'published' ? publishedEvents : draftEvents

  const filteredEvents = eventsByTab.filter(e =>
    e.title?.toLowerCase().includes(searchEvents.toLowerCase()) ||
    e.location_name?.toLowerCase().includes(searchEvents.toLowerCase())
  )

  const currentCandidatures = allCandidatures
    .filter(c => selectedEvent ? c.event_id === selectedEvent.id : true)
    .filter(c => statusFilter === 'all' ? true : c.status === statusFilter)
    .filter(c => verifFilter === 'all' ? true : c.exposant_data?.verification_status === verifFilter)
    .filter(c => !searchCandidatures || c.profiles?.full_name?.toLowerCase().includes(searchCandidatures.toLowerCase()) || c.exposant_data?.business_name?.toLowerCase().includes(searchCandidatures.toLowerCase()))

  const pendingCount = currentCandidatures.filter(c => c.status === 'pending').length
  const manualReviewCount = allCandidatures.filter(c =>
    (selectedEvent ? c.event_id === selectedEvent.id : true) &&
    c.exposant_data?.verification_status === 'manual_review'
  ).length

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: `2px solid ${BRAND}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const TABLE_HEADERS = ['Exposant', 'Activité', 'Stand', 'Reçu le', 'Documents', 'Vérification', 'Statut', '']

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <AnimatePresence>{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}</AnimatePresence>
      <AnimatePresence>{deleteTarget && <DeleteEventModal event={deleteTarget} candidatureCount={eventCandidatures[deleteTarget.id] || 0} onCancel={() => setDeleteTarget(null)} onConfirm={handleDeleteEvent} />}</AnimatePresence>
      <Sidebar profile={profile} />

      <div style={{ marginLeft: isMobile ? 0 : 220, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: isMobile ? '0 14px 0 60px' : '0 28px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {selectedEvent && (
              <>
                <button onClick={() => { setSelectedEvent(null); setStatusFilter('all'); setVerifFilter('all'); setSearchCandidatures('') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: 13, flexShrink: 0 }}>
                  <ArrowLeft size={14} /> {!isMobile && 'Événements'}
                </button>
                <div style={{ width: 1, height: 16, background: '#E2E8F0', flexShrink: 0 }} />
              </>
            )}
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedEvent ? selectedEvent.title : 'Mes événements'}
            </p>
            {selectedEvent && pendingCount > 0 && <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>{pendingCount}</span>}
            {selectedEvent && manualReviewCount > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#FFF7ED', color: '#EA580C', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, flexShrink: 0, border: '1px solid #FED7AA' }}>
              <Eye size={9} /> {manualReviewCount}
            </span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isMobile && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} /><span style={{ fontSize: 11, fontWeight: 700, color: '#22C55E' }}>LIVE</span></div>}
            <button style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, padding: '5px 8px', cursor: 'pointer' }}><Bell size={14} style={{ color: '#64748B' }} /></button>
          </div>
        </header>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        <AnimatePresence mode="wait">
          {!selectedEvent && (
            <motion.div key="gallery" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>

              {/* ✅ TABS Published/Drafts */}
              <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: isMobile ? '0 14px' : '0 28px', display: 'flex', gap: 0 }}>
                {[
                  { key: 'published', label: 'Publiés', count: publishedEvents.length, icon: <CheckCircle size={13} /> },
                  { key: 'draft', label: 'Brouillons', count: draftEvents.length, icon: <FileEdit size={13} /> },
                ].map(t => (
                  <button key={t.key} onClick={() => setEventTab(t.key as any)}
                    style={{ background: 'none', border: 'none', padding: '14px 16px 12px', fontSize: 13, fontWeight: 600, color: eventTab === t.key ? BRAND : '#64748B', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', gap: 7 }}>
                    {t.icon} {t.label}
                    {t.count > 0 && (
                      <span style={{ background: eventTab === t.key ? BRAND : '#F1F5F9', color: eventTab === t.key ? 'white' : '#64748B', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 100, marginLeft: 2 }}>{t.count}</span>
                    )}
                    {eventTab === t.key && <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: BRAND }} />}
                  </button>
                ))}
              </div>

              <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: isMobile ? '10px 14px' : '10px 28px' }}>
                <div style={{ position: 'relative', maxWidth: isMobile ? '100%' : 340 }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input value={searchEvents} onChange={e => setSearchEvents(e.target.value)} placeholder={`Rechercher un ${eventTab === 'published' ? 'événement' : 'brouillon'}...`}
                    style={{ width: '100%', padding: '7px 12px 7px 30px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, color: '#0F172A', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => { e.target.style.borderColor = BRAND; e.target.style.background = 'white' }}
                    onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC' }} />
                </div>
              </div>

              <main style={{ padding: isMobile ? '14px' : '24px 28px' }}>
                {filteredEvents.length === 0 && eventTab === 'draft' && (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <FileEdit size={36} style={{ margin: '0 auto 14px', color: '#CBD5E1' }} />
                    <p style={{ fontSize: 14, color: '#64748B' }}>Aucun brouillon</p>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: isMobile ? 10 : 16 }}>
                  {eventTab === 'published' && (
                    <button onClick={() => router.push('/dashboard/creer-evenement')}
                      style={{ border: '2px dashed #E2E8F0', borderRadius: 12, padding: isMobile ? '20px' : '32px 20px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: isMobile ? 70 : 200 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = BRAND; e.currentTarget.style.background = '#EEF2FF' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = 'white' }}>
                      <div style={{ width: 36, height: 36, background: '#EEF2FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus size={18} style={{ color: BRAND }} /></div>
                      <div style={{ textAlign: isMobile ? 'left' : 'center' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: BRAND, marginBottom: 2 }}>Créer un événement</p>
                        <p style={{ fontSize: 11, color: '#94A3B8' }}>Publier un marché ou festival</p>
                      </div>
                    </button>
                  )}

                  {filteredEvents.map((event, i) => {
                    const count = eventCandidatures[event.id] || 0
                    const pendingApp = allCandidatures.filter(c => c.event_id === event.id && c.status === 'pending').length
                    const manualApp = allCandidatures.filter(c => c.event_id === event.id && c.exposant_data?.verification_status === 'manual_review').length
                    const isDraft = event.status === 'draft'
                    return (
                      <motion.div key={event.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        onClick={() => isDraft ? router.push(`/dashboard/creer-evenement?id=${event.id}`) : setSelectedEvent(event)}
                        style={{ background: 'white', border: `1px solid ${isDraft ? '#FDE68A' : '#E2E8F0'}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', opacity: isDraft ? 0.85 : 1 }}>
                        {!isMobile && <EventCover event={event} />}
                        <div style={{ padding: isMobile ? '12px 14px' : '14px 16px' }}>
                          {isMobile ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  {isDraft && <FileEdit size={11} style={{ color: '#F59E0B', flexShrink: 0 }} />}
                                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</p>
                                </div>
                                <p style={{ fontSize: 11, color: '#94A3B8' }}>{formatShort(event.start_date)} · {count} candidature(s)</p>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                {pendingApp > 0 && <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100 }}>{pendingApp}</span>}
                                <ChevronRight size={14} style={{ color: '#CBD5E1' }} />
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.3, flex: 1, paddingRight: 8 }}>{event.title}</h3>
                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                  {pendingApp > 0 && <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100 }}>{pendingApp} à traiter</span>}
                                  {manualApp > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#FFF7ED', color: '#EA580C', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100 }}><Eye size={9} /> {manualApp}</span>}
                                </div>
                              </div>
                              <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={10} /> {formatShort(event.start_date)}</p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #F8FAFC' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748B' }}>
                                  <Users size={12} style={{ color: BRAND }} />
                                  <span><strong style={{ color: '#0F172A' }}>{count}</strong> candidature{count !== 1 ? 's' : ''}</span>
                                </div>

                                {!isDraft && (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: 11, color: '#64748B' }}>
                                      <strong style={{ color: event.available_spots === 0 ? '#DC2626' : '#0F172A' }}>{event.available_spots}</strong>/{event.total_spots} places
                                    </span>
                                    <div style={{ width: 72, height: 4, background: '#F1F5F9', borderRadius: 100, overflow: 'hidden' }}>
                                      <div style={{
                                        height: '100%',
                                        width: `${event.total_spots > 0 ? Math.round(((event.total_spots - event.available_spots) / event.total_spots) * 100) : 0}%`,
                                        background: event.available_spots === 0 ? '#DC2626' : event.available_spots <= event.total_spots * 0.2 ? '#F59E0B' : BRAND,
                                        borderRadius: 100,
                                      }} />
                                    </div>
                                  </div>
                                )}

                                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(event) }}
                                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                  <Trash2 size={11} style={{ color: '#DC2626' }} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </main>
            </motion.div>
          )}

          {selectedEvent && (
            <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {!isMobile && (
                <div style={{ background: '#0F172A', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 2 }}>{selectedEvent.title}</p>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748B' }}>
                      <span>{formatDate(selectedEvent.start_date)}</span><span>·</span>
                      <span>{selectedEvent.location_name}</span><span>·</span>
                      <span>{selectedEvent.available_spots}/{selectedEvent.total_spots} places</span>
                    </div>
                  </div>
                  <span style={{ background: 'rgba(255,255,255,0.08)', color: '#94A3B8', fontSize: 11, padding: '4px 10px', borderRadius: 8 }}>{currentCandidatures.length} candidature(s)</span>
                </div>
              )}

              <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: isMobile ? '10px 14px' : '10px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input value={searchCandidatures} onChange={e => setSearchCandidatures(e.target.value)} placeholder="Rechercher un exposant..."
                    style={{ width: '100%', padding: '7px 12px 7px 30px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, color: '#0F172A', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => { e.target.style.borderColor = BRAND; e.target.style.background = 'white' }}
                    onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC' }} />
                </div>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
                  {[{ key: 'all', label: 'Tous' }, { key: 'pending', label: 'À valider' }, { key: 'validated', label: 'Validés' }, { key: 'rejected', label: 'Refusés' }].map(f => (
                    <button key={f.key} onClick={() => setStatusFilter(f.key)}
                      style={{ padding: '5px 12px', borderRadius: 8, border: statusFilter === f.key ? `1.5px solid ${BRAND}` : '1px solid #E2E8F0', background: statusFilter === f.key ? '#EEF2FF' : 'white', color: statusFilter === f.key ? BRAND : '#64748B', fontSize: 11, fontWeight: statusFilter === f.key ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {f.label}
                    </button>
                  ))}
                  <div style={{ width: 1, background: '#E2E8F0', margin: '0 4px', flexShrink: 0 }} />
                  <button onClick={() => setVerifFilter(verifFilter === 'manual_review' ? 'all' : 'manual_review')}
                    style={{ padding: '5px 12px', borderRadius: 8, border: verifFilter === 'manual_review' ? '1.5px solid #EA580C' : '1px solid #E2E8F0', background: verifFilter === 'manual_review' ? '#FFF7ED' : 'white', color: verifFilter === 'manual_review' ? '#EA580C' : '#64748B', fontSize: 11, fontWeight: verifFilter === 'manual_review' ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Eye size={10} /> À vérifier {manualReviewCount > 0 && `(${manualReviewCount})`}
                  </button>
                </div>
              </div>

              <main style={{ padding: isMobile ? '14px' : '20px 28px', flex: 1 }}>
                {currentCandidatures.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <Users size={36} style={{ margin: '0 auto 14px', color: '#CBD5E1' }} />
                    <p style={{ fontSize: 14, color: '#64748B' }}>Aucune candidature</p>
                  </div>
                ) : isMobile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {currentCandidatures.map(c => (
                      <div key={c.id} onClick={() => openSlideOver(c)}
                        style={{ background: 'white', border: `1px solid ${c.exposant_data?.verification_status === 'manual_review' ? '#FED7AA' : '#E2E8F0'}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                        <Avatar name={c.profiles?.full_name || '?'} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.exposant_data?.business_name || c.profiles?.full_name}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                            <StatusBadge status={c.status} />
                            {c.exposant_data?.verification_status === 'manual_review' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#EA580C', fontWeight: 600 }}><Eye size={9} /> Revue requise</span>}
                          </div>
                        </div>
                        <ChevronRight size={14} style={{ color: '#CBD5E1', flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
                          <th style={{ padding: '11px 16px', width: 40 }}>
                            <button onClick={() => { if (selectedIds.length === currentCandidatures.length) setSelectedIds([]); else setSelectedIds(currentCandidatures.map(c => c.id)) }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                              {selectedIds.length === currentCandidatures.length && currentCandidatures.length > 0 ? <CheckSquare size={15} style={{ color: BRAND }} /> : <Square size={15} />}
                            </button>
                          </th>
                          {TABLE_HEADERS.map((h) => (
                            <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {currentCandidatures.map((c, i) => {
                          const isSelected = selectedIds.includes(c.id)
                          const needsReview = c.exposant_data?.verification_status === 'manual_review'
                          return (
                            <tr key={c.id}
                              style={{ borderBottom: i < currentCandidatures.length - 1 ? '1px solid #F8FAFC' : 'none', background: needsReview ? '#FFFBEB' : isSelected ? '#EEF2FF' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
                              onMouseEnter={e => { if (!isSelected && !needsReview) e.currentTarget.style.background = '#FAFAFA' }}
                              onMouseLeave={e => { e.currentTarget.style.background = needsReview ? '#FFFBEB' : isSelected ? '#EEF2FF' : 'transparent' }}
                              onClick={() => openSlideOver(c)}>
                              <td style={{ padding: '12px 16px' }} onClick={e => { e.stopPropagation(); toggleSelect(c.id) }}>
                                {isSelected ? <CheckSquare size={15} style={{ color: BRAND }} /> : <Square size={15} style={{ color: '#CBD5E1' }} />}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <Avatar name={c.profiles?.full_name || '?'} />
                                  <div>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{c.exposant_data?.business_name || c.profiles?.full_name}</p>
                                    <p style={{ fontSize: 11, color: '#94A3B8' }}>{c.profiles?.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px' }}><p style={{ fontSize: 12, color: '#64748B', maxWidth: 160 }}>{c.exposant_data?.description?.substring(0, 30) || '—'}</p></td>
                              <td style={{ padding: '12px 14px' }}><p style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>{c.exposant_data?.stand_width ? `${c.exposant_data.stand_width}m × ${c.exposant_data.stand_length}m` : '—'}</p></td>
                              <td style={{ padding: '12px 14px' }}><p style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>{formatDate(c.created_at)}</p></td>
                              <td style={{ padding: '12px 14px' }}><div style={{ display: 'flex', gap: 4 }}><DocBadge ok={!!c.exposant_data?.kbis_url} label="Kbis" /><DocBadge ok={!!c.exposant_data?.assurance_url} label="RC Pro" /></div></td>
                              <td style={{ padding: '12px 14px' }}><VerifBadge status={c.exposant_data?.verification_status || 'pending'} /></td>
                              <td style={{ padding: '12px 14px' }}><StatusBadge status={c.status} /></td>
                              <td style={{ padding: '12px 14px' }}><ChevronRight size={14} style={{ color: '#CBD5E1' }} /></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </main>

              <AnimatePresence>
                {selectedIds.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                    style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0F172A', borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.3)', zIndex: 30 }}>
                    <span style={{ fontSize: 13, color: '#94A3B8' }}><strong style={{ color: 'white' }}>{selectedIds.length}</strong> sélectionné(s)</span>
                    <button onClick={handleBulkValidate} style={{ display: 'flex', alignItems: 'center', gap: 6, background: BRAND, color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <CheckCircle size={13} /> Valider + factures
                    </button>
                    <button onClick={() => setSelectedIds([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={14} /></button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Slide-over */}
      <AnimatePresence>
        {slideOver && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeSlideOver}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40, backdropFilter: 'blur(2px)' }} />
            <motion.div initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: isMobile ? '100%' : 440, background: 'white', zIndex: 50, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 40px rgba(0,0,0,0.12)' }}>

              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={slideOver.profiles?.full_name || '?'} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{slideOver.exposant_data?.business_name || slideOver.profiles?.full_name}</p>
                    <p style={{ fontSize: 11, color: '#94A3B8' }}>{slideOver.profiles?.email}</p>
                  </div>
                </div>
                <button onClick={closeSlideOver} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px', cursor: 'pointer', display: 'flex' }}>
                  <X size={14} style={{ color: '#64748B' }} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <StatusBadge status={slideOver.status} />
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>{new Date(slideOver.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>

                {/* ✅ Affichage motif refus si rejeté */}
                {slideOver.status === 'rejected' && slideOver.rejection_reason && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Motif du refus</p>
                    <p style={{ fontSize: 13, color: '#991B1B', lineHeight: 1.5 }}>{slideOver.rejection_reason}</p>
                  </div>
                )}

                <div style={{ background: slideOver.exposant_data?.verification_status === 'manual_review' ? '#FFF7ED' : '#F8FAFC', border: `1px solid ${slideOver.exposant_data?.verification_status === 'manual_review' ? '#FED7AA' : '#E2E8F0'}`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ScanSearch size={13} style={{ color: BRAND }} />
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vérification dossier</p>
                    </div>
                    <VerifBadge status={slideOver.exposant_data?.verification_status || 'pending'} />
                  </div>
                  {slideOver.exposant_data?.ocr_score !== null && slideOver.exposant_data?.ocr_score !== undefined && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', marginBottom: 4 }}>
                        <span>Score OCR</span>
                        <span style={{ fontWeight: 700, color: slideOver.exposant_data.ocr_score >= 0.8 ? '#16A34A' : slideOver.exposant_data.ocr_score >= 0.5 ? '#F59E0B' : '#DC2626' }}>
                          {Math.round(slideOver.exposant_data.ocr_score * 100)}%
                        </span>
                      </div>
                      <div style={{ height: 6, background: '#E2E8F0', borderRadius: 100, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${slideOver.exposant_data.ocr_score * 100}%`, background: slideOver.exposant_data.ocr_score >= 0.8 ? '#16A34A' : slideOver.exposant_data.ocr_score >= 0.5 ? '#F59E0B' : '#DC2626', borderRadius: 100 }} />
                      </div>
                    </div>
                  )}
                  {slideOver.exposant_data?.verification_status !== 'auto_verified' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleManualVerify(slideOver.exposant_id)} disabled={verifyingDossier}
                        style={{ flex: 1, background: '#16A34A', color: 'white', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        {verifyingDossier ? <Loader size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> : <UserCheck size={11} />}
                        Valider manuellement
                      </button>
                      {slideOver.exposant_data?.verification_status !== 'manual_review' && (
                        <button onClick={() => handleFlagReview(slideOver.exposant_id)}
                          style={{ flex: 1, background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA', borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                          <AlertTriangle size={11} /> Signaler
                        </button>
                      )}
                    </div>
                  )}
                  {slideOver.exposant_data?.verification_status === 'auto_verified' && slideOver.exposant_data?.reviewed_by && (
                    <p style={{ fontSize: 11, color: '#16A34A', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={10} /> Validé manuellement par votre équipe
                    </p>
                  )}
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Informations exposant</p>
                  {[
                    { label: 'SIREN', value: slideOver.exposant_data?.siren || '—', icon: <Shield size={11} /> },
                    { label: 'Activité', value: slideOver.exposant_data?.description || '—', icon: <User size={11} /> },
                    { label: 'Stand', value: slideOver.exposant_data?.stand_width ? `${slideOver.exposant_data.stand_width}m × ${slideOver.exposant_data.stand_length}m` : '—', icon: <Ruler size={11} /> },
                    { label: 'Électricité', value: slideOver.exposant_data?.needs_electricity ? 'Requise' : 'Non requise', icon: <Zap size={11} /> },
                  ].map((item, i) => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: i < 3 ? 8 : 0, marginBottom: i < 3 ? 8 : 0, borderBottom: i < 3 ? '1px solid #F1F5F9' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748B', fontSize: 12 }}>{item.icon} {item.label}</div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#0F172A', textAlign: 'right', maxWidth: 200 }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Documents légaux</p>
                    {signedUrlsLoading && <Loader size={11} style={{ color: '#94A3B8', animation: 'spin 0.8s linear infinite' }} />}
                  </div>
                  {[
                    { label: 'Extrait Kbis', hasDoc: !!slideOver.exposant_data?.kbis_url, url: signedUrls.kbis },
                    { label: 'Attestation RC Pro', hasDoc: !!slideOver.exposant_data?.assurance_url, url: signedUrls.assurance },
                  ].map((doc, i) => (
                    <div key={doc.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < 1 ? 8 : 0, marginBottom: i < 1 ? 8 : 0, borderBottom: i < 1 ? '1px solid #F1F5F9' : 'none' }}>
                      <DocBadge ok={doc.hasDoc} label={doc.label} />
                      {doc.hasDoc && (doc.url
                        ? <a href={doc.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: BRAND, fontWeight: 500, textDecoration: 'none' }}>Voir <ExternalLink size={10} /></a>
                        : <span style={{ fontSize: 11, color: '#94A3B8' }}>Chargement...</span>
                      )}
                    </div>
                  ))}
                  {(signedUrls.kbis || signedUrls.assurance) && (
                    <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={9} /> Liens sécurisés — expirent dans 5 minutes
                    </p>
                  )}
                </div>

                {showRejectInput && (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#DC2626', display: 'block', marginBottom: 6 }}>Motif du refus <span style={{ color: '#94A3B8', fontWeight: 400 }}>(sera envoyé à l'exposant)</span></label>
                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Ex: Dossier incomplet, RC Pro expirée, secteur d'activité non compatible..."
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, resize: 'none', height: 80, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#0F172A' }} />
                    <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>{rejectReason.length}/500 caractères</p>
                  </div>
                )}
              </div>

              {slideOver.status === 'pending' && (
                <div style={{ padding: '16px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button onClick={() => handleValidate(slideOver.id)} disabled={updating === slideOver.id}
                    style={{ width: '100%', background: '#16A34A', color: 'white', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: updating === slideOver.id ? 0.7 : 1 }}>
                    {updating === slideOver.id ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <ThumbsUp size={14} />}
                    Approuver + Générer la facture
                  </button>
                  {!showRejectInput
                    ? <button onClick={() => setShowRejectInput(true)} style={{ width: '100%', background: 'white', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                        <ThumbsDown size={14} /> Refuser avec un motif
                      </button>
                    : <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setShowRejectInput(false); setRejectReason('') }}
                          style={{ flex: 1, background: 'white', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                          Annuler
                        </button>
                        <button onClick={() => handleReject(slideOver.id)} disabled={updating === slideOver.id}
                          style={{ flex: 2, background: '#DC2626', color: 'white', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          {updating === slideOver.id ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <ThumbsDown size={13} />}
                          Confirmer le refus
                        </button>
                      </div>
                  }
                </div>
              )}
              {slideOver.status !== 'pending' && (
                <div style={{ padding: '16px 20px', borderTop: '1px solid #E2E8F0' }}>
                  <div style={{ background: slideOver.status === 'validated' ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${slideOver.status === 'validated' ? '#BBF7D0' : '#FECACA'}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {slideOver.status === 'validated' ? <CheckCircle size={16} style={{ color: '#16A34A' }} /> : <XCircle size={16} style={{ color: '#DC2626' }} />}
                    <p style={{ fontSize: 12, color: slideOver.status === 'validated' ? '#15803D' : '#DC2626', fontWeight: 500 }}>
                      {slideOver.status === 'validated' ? 'Dossier approuvé — facture générée' : 'Dossier refusé'}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}