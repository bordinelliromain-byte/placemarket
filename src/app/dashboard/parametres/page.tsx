'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import Sidebar from '@/components/Sidebar'
import {
  User, Bell, Shield, CreditCard, Save, CheckCircle,
  Eye, EyeOff, Loader, Smartphone, X, QrCode, AlertTriangle,
  Star, Zap, ExternalLink
} from 'lucide-react'

const BRAND = '#4F46E5'
const NOTIF_KEY = 'pulsemarket_notifs'

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

export default function Parametres() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifSms, setNotifSms] = useState(false)
  const [notifNewEvent, setNotifNewEvent] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Pro
  const [upgradingPro, setUpgradingPro] = useState(false)
  const [cancelingPro, setCancelingPro] = useState(false)
  const [openingPortal, setOpeningPortal] = useState(false)

  // 2FA
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaStep, setMfaStep] = useState<'idle' | 'qr' | 'verify' | 'done'>('idle')
  const [mfaQr, setMfaQr] = useState('')
  const [mfaSecret, setMfaSecret] = useState('')
  const [mfaFactorId, setMfaFactorId] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaError, setMfaError] = useState('')

  // Delete
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const router = useRouter()
  const supabase = createClient()
  const isMobile = useIsMobile()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)
      setFullName(profileData?.full_name || '')
      setEmail(user.email || '')
      setPhone(profileData?.phone || '')

      // ✅ Charger notifs depuis localStorage
      try {
        const saved = localStorage.getItem(NOTIF_KEY)
        if (saved) {
          const { email: e, sms: s, newEvent: n } = JSON.parse(saved)
          setNotifEmail(e ?? true)
          setNotifSms(s ?? false)
          setNotifNewEvent(n ?? true)
        }
      } catch (e) {}

      const { data: factors } = await supabase.auth.mfa.listFactors()
      const hasTotp = factors?.totp?.some(f => f.status === 'verified')
      setMfaEnabled(!!hasTotp)
      setLoading(false)
    }
    getData()
  }, [router, supabase])

  const isPro = profile?.plan === 'pro'
  const isCanceling = profile?.plan === 'canceling'

  const handleSave = async () => {
    setSaving(true); setMessage(null)
    try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) return
      await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id)
      if (newPassword) {
        if (newPassword.length < 6) throw new Error('Le mot de passe doit faire au moins 6 caractères')
        await supabase.auth.updateUser({ password: newPassword })
      }
      // ✅ Sauvegarder notifs en localStorage
      try {
        localStorage.setItem(NOTIF_KEY, JSON.stringify({ email: notifEmail, sms: notifSms, newEvent: notifNewEvent }))
      } catch (e) {}
      setMessage({ type: 'success', text: 'Paramètres sauvegardés avec succès' })
      setNewPassword('')
    } catch (err: any) { setMessage({ type: 'error', text: err.message }) }
    setSaving(false)
  }

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
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
    setUpgradingPro(false)
  }

  const handleCancelPro = async () => {
    if (!confirm('Êtes-vous sûr de vouloir arrêter votre abonnement Pro ? Vous conservez l\'accès jusqu\'à la fin de la période en cours.')) return
    setCancelingPro(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      const { success, error } = await res.json()
      if (error) throw new Error(error)
      if (success) {
        setProfile((prev: any) => ({ ...prev, plan: 'canceling' }))
        setMessage({ type: 'success', text: 'Abonnement annulé — vous gardez l\'accès Pro jusqu\'à la fin de la période.' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
    setCancelingPro(false)
  }

  // ✅ Portail Stripe (gérer CB)
  const handleOpenPortal = async () => {
    setOpeningPortal(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      if (url) window.location.href = url
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
    setOpeningPortal(false)
  }

  // ── 2FA
  const handleEnable2FA = async () => {
    setMfaLoading(true); setMfaError('')
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'PulseMarket' })
      if (error) throw error
      setMfaQr(data.totp.qr_code)
      setMfaSecret(data.totp.secret)
      setMfaFactorId(data.id)
      setMfaStep('qr')
    } catch (err: any) { setMfaError(err.message) }
    setMfaLoading(false)
  }

  const handleVerify2FA = async () => {
    if (mfaCode.length !== 6) { setMfaError('Le code doit faire 6 chiffres'); return }
    setMfaLoading(true); setMfaError('')
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
      if (challengeError) throw challengeError
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challengeData.id, code: mfaCode })
      if (verifyError) throw verifyError
      setMfaEnabled(true); setMfaStep('done'); setMfaCode('')
    } catch (err: any) { setMfaError('Code incorrect — réessayez') }
    setMfaLoading(false)
  }

  const handleDisable2FA = async () => {
    if (!confirm('Désactiver la double authentification ?')) return
    setMfaLoading(true)
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      for (const factor of factors?.totp || []) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id })
      }
      setMfaEnabled(false); setMfaStep('idle')
    } catch (err: any) { setMfaError(err.message) }
    setMfaLoading(false)
  }

  // ✅ VRAIE SUPPRESSION DU COMPTE
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SUPPRIMER MON COMPTE') {
      setMessage({ type: 'error', text: 'Veuillez taper "SUPPRIMER MON COMPTE" pour confirmer' })
      return
    }
    setDeletingAccount(true)
    try {
      // ⚠️ L'API récupère l'userId depuis la session serveur (fix de la faille du jour 19) —
      // on n'envoie plus userId dans le body, seulement la confirmation textuelle
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: deleteConfirmText })
      })
      const { success, error } = await res.json()
      if (error) throw new Error(error)
      if (success) {
        await supabase.auth.signOut()
        try { localStorage.clear() } catch (e) {}
        router.push('/?deleted=1')
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Erreur : ' + err.message })
      setDeletingAccount(false)
    }
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ marginLeft: isMobile ? 0 : 220, flex: 1, minWidth: 0 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: isMobile ? '0 14px 0 60px' : '0 28px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Paramètres</p>
          <button onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: BRAND, color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </header>

        <main style={{ padding: isMobile ? '14px' : '28px', maxWidth: 700, margin: '0 auto' }}>
          <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {message && (
              <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: message.type === 'success' ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${message.type === 'success' ? '#BBF7D0' : '#FECACA'}`, color: message.type === 'success' ? '#15803D' : '#DC2626', fontSize: 13, fontWeight: 500 }}>
                {message.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                {message.text}
              </motion.div>
            )}

            {/* Infos personnelles */}
            <motion.div variants={fadeUp} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, background: '#EEF2FF', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={15} style={{ color: BRAND }} /></div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Informations personnelles</p>
                  <p style={{ fontSize: 11, color: '#94A3B8' }}>Nom, email, téléphone</p>
                </div>
              </div>
              <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Nom complet', val: fullName, set: setFullName, placeholder: 'Votre nom', disabled: false },
                  { label: 'Email', val: email, set: () => {}, placeholder: '', disabled: true },
                  { label: 'Téléphone', val: phone, set: setPhone, placeholder: '+33 6 00 00 00 00', disabled: false },
                ].map((f, i) => (
                  <div key={i}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>{f.label}</label>
                    <input value={f.val} onChange={e => !f.disabled && f.set(e.target.value)} placeholder={f.placeholder} disabled={f.disabled}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: f.disabled ? '#94A3B8' : '#0F172A', background: f.disabled ? '#F8FAFC' : '#FAFAFA', outline: 'none', boxSizing: 'border-box', cursor: f.disabled ? 'not-allowed' : 'text' }}
                      onFocus={e => { if (!f.disabled) { e.target.style.borderColor = BRAND; e.target.style.background = 'white' } }}
                      onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = f.disabled ? '#F8FAFC' : '#FAFAFA' }} />
                    {f.disabled && <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Pour modifier votre email, contactez le support</p>}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ✅ Mon abonnement */}
            {profile?.role === 'exposant' && (
              <motion.div variants={fadeUp} style={{ background: '#0F172A', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, background: 'rgba(79,70,229,0.2)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={15} style={{ color: '#818CF8' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>Mon abonnement</p>
                    <p style={{ fontSize: 11, color: '#475569' }}>Plan actuel et facturation</p>
                  </div>
                  {(isPro || isCanceling) && (
                    <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, background: 'rgba(251,191,36,0.15)', color: '#FBBF24', padding: '3px 10px', borderRadius: 100, border: '1px solid rgba(251,191,36,0.3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Star size={9} style={{ fill: '#FBBF24' }} /> PRO
                    </span>
                  )}
                </div>

                <div style={{ padding: '18px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'white', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {(isPro || isCanceling) && <Star size={13} style={{ color: '#FBBF24', fill: '#FBBF24' }} />}
                        {isPro || isCanceling ? 'Plan Pro' : 'Plan Gratuit'}
                      </p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: isPro || isCanceling ? '#FBBF24' : '#64748B' }}>
                        {isPro || isCanceling ? '20€/mois' : '0€'}
                      </p>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
                      {isCanceling
                        ? 'Annulation en cours — vous gardez l\'accès Pro jusqu\'à la fin de la période.'
                        : isPro
                        ? 'Candidatures illimitées · Badge Pro · Alertes SMS · Marchés exclusifs'
                        : '1 candidature par mois · Accès limité'
                      }
                    </p>
                  </div>

                  {(isPro || isCanceling) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {['Candidatures illimitées', 'Badge Pro visible', 'Alertes SMS géolocalisées', 'Marchés exclusifs Pro'].map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94A3B8' }}>
                          <CheckCircle size={12} style={{ color: '#34D399', flexShrink: 0 }} /> {f}
                        </div>
                      ))}
                    </div>
                  )}

                  {!isPro && !isCanceling && (
                    <button onClick={handleUpgradePro} disabled={upgradingPro}
                      style={{ width: '100%', background: BRAND, color: 'white', border: 'none', borderRadius: 9, padding: '12px 0', fontSize: 13, fontWeight: 700, cursor: upgradingPro ? 'not-allowed' : 'pointer', opacity: upgradingPro ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {upgradingPro
                        ? <><Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Chargement...</>
                        : <><Zap size={14} /> Passer au Plan Pro — 20€/mois</>
                      }
                    </button>
                  )}

                  {isPro && !isCanceling && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* ✅ Bouton Stripe Portal */}
                      <button onClick={handleOpenPortal} disabled={openingPortal}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '11px 0', fontSize: 13, fontWeight: 600, cursor: openingPortal ? 'not-allowed' : 'pointer', opacity: openingPortal ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {openingPortal
                          ? <><Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Chargement...</>
                          : <><ExternalLink size={13} /> Gérer paiement & factures</>
                        }
                      </button>
                      <button onClick={handleCancelPro} disabled={cancelingPro}
                        style={{ width: '100%', background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, padding: '11px 0', fontSize: 13, fontWeight: 600, cursor: cancelingPro ? 'not-allowed' : 'pointer', opacity: cancelingPro ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {cancelingPro
                          ? <><Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Annulation...</>
                          : <><AlertTriangle size={14} /> Arrêter mon abonnement</>
                        }
                      </button>
                    </div>
                  )}

                  {isCanceling && (
                    <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 9, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AlertTriangle size={14} style={{ color: '#F59E0B', flexShrink: 0 }} />
                      <p style={{ fontSize: 12, color: '#F59E0B', lineHeight: 1.5 }}>
                        Votre abonnement se terminera automatiquement à la fin de la période en cours.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Mot de passe */}
            <motion.div variants={fadeUp} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, background: '#EEF2FF', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={15} style={{ color: BRAND }} /></div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Mot de passe</p>
                  <p style={{ fontSize: 11, color: '#94A3B8' }}>Modifiez votre mot de passe</p>
                </div>
              </div>
              <div style={{ padding: '18px' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Nouveau mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Laissez vide pour ne pas changer"
                    style={{ width: '100%', padding: '9px 42px 9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: '#0F172A', background: '#FAFAFA', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => { e.target.style.borderColor = BRAND; e.target.style.background = 'white' }}
                    onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#FAFAFA' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>Minimum 6 caractères</p>
              </div>
            </motion.div>

            {/* 2FA */}
            <motion.div variants={fadeUp} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, background: '#EEF2FF', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Smartphone size={15} style={{ color: BRAND }} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Double authentification (2FA)</p>
                    {mfaEnabled && <span style={{ fontSize: 10, fontWeight: 700, background: '#F0FDF4', color: '#16A34A', padding: '2px 8px', borderRadius: 100, border: '1px solid #BBF7D0' }}>Activée</span>}
                  </div>
                  <p style={{ fontSize: 11, color: '#94A3B8' }}>Protégez votre compte avec un code temporaire</p>
                </div>
              </div>
              <div style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: mfaStep === 'qr' || mfaStep === 'done' ? 14 : 0 }}>
                  <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, flex: 1 }}>
                    Utilisez Google Authenticator, Authy ou 1Password.
                  </p>
                  {mfaEnabled ? (
                    <button onClick={handleDisable2FA} disabled={mfaLoading}
                      style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                      Désactiver
                    </button>
                  ) : (
                    <button onClick={handleEnable2FA} disabled={mfaLoading || mfaStep === 'qr'}
                      style={{ background: BRAND, color: 'white', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {mfaLoading ? <Loader size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <QrCode size={12} />}
                      Activer
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {mfaStep === 'qr' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>1. Scannez ce QR code</p>
                        <button onClick={() => setMfaStep('idle')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={14} /></button>
                      </div>
                      <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12, lineHeight: 1.6 }}>Ouvrez <strong>Google Authenticator</strong> ou <strong>Authy</strong> et scannez ce code.</p>
                      {mfaQr && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><img src={mfaQr} alt="QR Code 2FA" style={{ width: 160, height: 160, borderRadius: 8, border: '1px solid #E2E8F0' }} /></div>}
                      <div style={{ background: '#EEF2FF', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
                        <p style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>Ou entrez ce code manuellement :</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: BRAND, fontFamily: 'monospace', letterSpacing: '0.1em' }}>{mfaSecret}</p>
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>2. Entrez le code à 6 chiffres</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input value={mfaCode} onChange={e => { setMfaCode(e.target.value.replace(/\D/g, '').substring(0, 6)); setMfaError('') }}
                          placeholder="000000" maxLength={6}
                          style={{ flex: 1, padding: '9px 12px', border: `1px solid ${mfaError ? '#FECACA' : '#E2E8F0'}`, borderRadius: 8, fontSize: 16, color: '#0F172A', background: 'white', outline: 'none', textAlign: 'center', letterSpacing: '0.2em', fontFamily: 'monospace' }}
                          onKeyDown={e => e.key === 'Enter' && handleVerify2FA()} />
                        <button onClick={handleVerify2FA} disabled={mfaLoading || mfaCode.length !== 6}
                          style={{ background: BRAND, color: 'white', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: mfaCode.length !== 6 ? 'not-allowed' : 'pointer', opacity: mfaCode.length !== 6 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {mfaLoading ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle size={13} />}
                          Vérifier
                        </button>
                      </div>
                      {mfaError && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 8 }}>{mfaError}</p>}
                    </motion.div>
                  )}
                  {mfaStep === 'done' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
                      <CheckCircle size={16} style={{ color: '#16A34A', flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#15803D' }}>2FA activée avec succès !</p>
                        <p style={{ fontSize: 12, color: '#16A34A', marginTop: 2 }}>Votre compte est maintenant protégé.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Notifications */}
            <motion.div variants={fadeUp} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, background: '#EEF2FF', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bell size={15} style={{ color: BRAND }} /></div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Notifications</p>
                  <p style={{ fontSize: 11, color: '#94A3B8' }}>Gérer vos alertes</p>
                </div>
              </div>
              <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Notifications par email', sub: 'Candidatures, validations, messages', val: notifEmail, set: setNotifEmail },
                  { label: 'Notifications SMS', sub: 'Alertes urgentes (Plan Pro)', val: notifSms, set: setNotifSms },
                  { label: 'Alertes nouveaux événements', sub: "Notifié dès qu'un marché est publié près de vous", val: notifNewEvent, set: setNotifNewEvent },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < 2 ? 14 : 0, marginBottom: i < 2 ? 14 : 0, borderBottom: i < 2 ? '1px solid #F8FAFC' : 'none', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{item.label}</p>
                      <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{item.sub}</p>
                    </div>
                    <button onClick={() => item.set(!item.val)}
                      style={{ width: 44, height: 24, borderRadius: 100, border: 'none', cursor: 'pointer', background: item.val ? BRAND : '#E2E8F0', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                      <div style={{ width: 18, height: 18, background: 'white', borderRadius: '50%', position: 'absolute', top: 3, left: item.val ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ✅ Danger zone avec vraie suppression */}
            <motion.div variants={fadeUp} style={{ background: 'white', border: '1px solid #FECACA', borderRadius: 12, padding: '18px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', marginBottom: 4 }}>Zone de danger</p>
              <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 14 }}>La suppression de votre compte est définitive et irréversible.</p>

              {!showDeleteConfirm ? (
                <button onClick={() => setShowDeleteConfirm(true)}
                  style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 9, padding: '9px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Supprimer mon compte
                </button>
              ) : (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '14px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                    <AlertTriangle size={16} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>Cette action est irréversible</p>
                      <p style={{ fontSize: 12, color: '#7F1D1D', lineHeight: 1.6 }}>
                        Toutes vos données seront supprimées : profil, candidatures, factures, paiements, et abonnement Pro. Aucune récupération possible.
                      </p>
                    </div>
                  </div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#DC2626', display: 'block', marginBottom: 6 }}>
                    Tapez <strong>SUPPRIMER MON COMPTE</strong> pour confirmer
                  </label>
                  <input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder="SUPPRIMER MON COMPTE"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, color: '#0F172A', background: 'white', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                      style={{ flex: 1, background: 'white', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Annuler
                    </button>
                    <button onClick={handleDeleteAccount} disabled={deletingAccount || deleteConfirmText !== 'SUPPRIMER MON COMPTE'}
                      style={{ flex: 2, background: deleteConfirmText === 'SUPPRIMER MON COMPTE' ? '#DC2626' : '#F1F5F9', color: deleteConfirmText === 'SUPPRIMER MON COMPTE' ? 'white' : '#94A3B8', border: 'none', borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 700, cursor: deleteConfirmText === 'SUPPRIMER MON COMPTE' && !deletingAccount ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {deletingAccount ? <><Loader size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> Suppression...</> : 'Confirmer la suppression'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

          </motion.div>
        </main>
      </div>
    </div>
  )
}