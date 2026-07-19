'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { openFacturePDF } from '@/lib/generateFacture'
import {
  CheckCircle, FileText, ArrowLeft, Loader, MapPin,
  Calendar, Mail, Navigation, Sparkles,
  QrCode, Clock
} from 'lucide-react'

const BRAND = '#4F46E5'

function PaiementSuccessContent() {
  const [loading, setLoading] = useState(true)
  const [candidature, setCandidature] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const candidatureId = searchParams.get('candidature_id')

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)

      if (candidatureId) {
        // 🔧 FIX — on ne tente plus de passer status='paid' ici.
        // Le vrai statut est posé par le webhook Stripe (service_role),
        // seul habilité à le faire — un exposant n'a pas le droit de
        // modifier sa propre candidature (RLS), donc cette tentative
        // échouait à chaque fois et affichait une erreur sur la page
        // de confirmation, juste après un paiement pourtant réussi.

        // ✅ Récupère candidature + event + mairie en 1 seule requête
        const { data: app } = await supabase
          .from('applications')
          .select(`
            *,
            profiles:exposant_id(full_name, email),
            events:event_id(
              title, start_date, location_name, price_per_spot, latitude, longitude, organisateur_id,
              organisateur:organisateur_id (email, organisation_name, full_name, logo_url)
            )
          `)
          .eq('id', candidatureId)
          .single()

        if (app) {
          const mairie = (app.events?.organisateur as any) || null
          const formattedDate = app.events?.start_date
            ? new Date(app.events.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
            : ''

          // ✅ Email à l'EXPOSANT (paiement confirmé)
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'paiement_confirme',
              to: profileData?.email,
              data: {
                exposantNom: profileData?.full_name || '',
                eventTitle: app.events?.title || '',
                eventDate: formattedDate,
                eventLocation: app.events?.location_name || '',
                redevanceAOT: app.events?.price_per_spot || 0,
                fraisPlateforme: 2,
                // ✅ AJOUT : bandeau mairie en haut de l'email
                mairieNom: mairie?.organisation_name || mairie?.full_name,
                mairieLogoUrl: mairie?.logo_url,
              }
            })
          }).catch(err => console.error('Email paiement_confirme error:', err))

          // ✅ Email à la MAIRIE (notification paiement reçu)
          if (mairie?.email) {
            fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'paiement_recu_mairie',
                to: mairie.email,
                data: {
                  exposantNom: profileData?.full_name || '',
                  exposantEmail: profileData?.email || '',
                  eventTitle: app.events?.title || '',
                  eventDate: formattedDate,
                  montant: app.events?.price_per_spot || 0,
                }
              })
            }).catch(err => console.error('Email paiement_recu_mairie error:', err))
          }

          const { data: expData } = await supabase
            .from('exposant_data').select('*').eq('user_id', user.id).single()
          setCandidature({ ...app, exposant_data: expData })
        }
      }

      setLoading(false)
    }
    getData()
  }, [candidatureId])

  const handleVoirFacture = () => {
    if (!candidature) return
    openFacturePDF({
      candidatureId: candidature.id,
      exposantNom: profile?.full_name || '',
      exposantEmail: profile?.email || '',
      exposantSiren: candidature.exposant_data?.siren,
      exposantBusinessName: candidature.exposant_data?.business_name,
      eventTitle: candidature.events?.title || '',
      eventDate: candidature.events?.start_date
        ? new Date(candidature.events.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : '',
      eventLocation: candidature.events?.location_name || '',
      emplacement: candidature.spot_label || '',
      redevanceAOT: candidature.events?.price_per_spot || 0,
      fraisPlateforme: 2,
    })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <Loader size={28} style={{ color: BRAND, animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Inter, system-ui, sans-serif' }}>Confirmation du paiement...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const eventDate = candidature?.events?.start_date ? new Date(candidature.events.start_date) : null
  const daysUntil = eventDate ? Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
  const hasCoords = candidature?.events?.latitude && candidature?.events?.longitude

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Inter', system-ui, sans-serif", padding: '24px 16px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 540, margin: '0 auto' }}>

        {/* Hero confirmation */}
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4, type: 'spring' }}
          style={{ background: 'white', borderRadius: 20, padding: '40px 32px', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.06)', marginBottom: 16 }}>

          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            style={{ width: 72, height: 72, background: '#F0FDF4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px solid #BBF7D0' }}>
            <CheckCircle size={36} style={{ color: '#16A34A' }} />
          </motion.div>

          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginBottom: 8, letterSpacing: '-0.02em' }}>
            Paiement confirmé !
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
            Votre place est réservée pour{' '}
            <strong style={{ color: '#0F172A' }}>{candidature?.events?.title || 'l\'événement'}</strong>
          </p>

          {/* Countdown */}
          {daysUntil !== null && daysUntil > 0 && (
            <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Clock size={16} style={{ color: BRAND }} />
              <p style={{ fontSize: 14, color: BRAND, fontWeight: 600 }}>
                {daysUntil === 1 ? 'Demain' : `Dans ${daysUntil} jours`} — {eventDate?.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          )}

          {candidature && (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', textAlign: 'left' }}>
              {[
                { label: 'Date', value: eventDate?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) },
                { label: 'Lieu', value: candidature.events?.location_name },
                ...(candidature.spot_label ? [{ label: 'Emplacement', value: `Case ${candidature.spot_label}` }] : []),
                { label: 'Redevance AOT', value: `${candidature.events?.price_per_spot || 0} €` },
                { label: 'Frais de service', value: '2 €' },
                { label: 'Total TTC', value: `${(candidature.events?.price_per_spot || 0) + 2} €`, total: true },
              ].map((item: any, i, arr) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingBottom: i < arr.length - 1 ? 8 : 0, marginBottom: i < arr.length - 1 ? 8 : 0, borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                  <span style={{ color: '#64748B' }}>{item.label}</span>
                  <span style={{ fontWeight: item.total ? 700 : 500, color: item.total ? BRAND : item.label === 'Emplacement' ? BRAND : '#0F172A', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {item.label === 'Emplacement' && <MapPin size={10} style={{ color: BRAND }} />}
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ✅ Timeline prochaines étapes */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}
          style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px 22px', marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} style={{ color: BRAND }} /> Prochaines étapes
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              {
                icon: <Mail size={14} />,
                title: 'Email de confirmation envoyé',
                desc: 'Votre facture est dans votre boîte mail',
                done: true,
              },
              {
                icon: <QrCode size={14} />,
                title: 'Votre AOT (autorisation officielle)',
                desc: 'Téléchargeable maintenant — à présenter le jour J',
                done: true,
                action: () => router.push('/dashboard/mes-marches'),
                actionLabel: 'Télécharger',
              },
              {
                icon: <Navigation size={14} />,
                title: 'Itinéraire le jour J',
                desc: hasCoords ? 'Cliquez pour ouvrir Google Maps' : 'À retrouver dans Mes marchés',
                done: false,
                ...(hasCoords && {
                  action: () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${candidature.events.latitude},${candidature.events.longitude}`, '_blank'),
                  actionLabel: 'GPS'
                })
              },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: step.done ? '#F0FDF4' : step.highlight ? '#FDF4FF' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: step.done ? '#16A34A' : step.highlight ? '#9333EA' : '#64748B' }}>
                  {step.done ? <CheckCircle size={14} /> : step.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>{step.title}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.5 }}>{step.desc}</p>
                </div>
                {step.action && (
                  <button onClick={step.action}
                    style={{ background: step.highlight ? BRAND : '#F1F5F9', color: step.highlight ? 'white' : '#475569', border: 'none', borderRadius: 7, padding: '6px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {step.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Actions secondaires */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={handleVoirFacture}
              style={{ width: '100%', background: 'white', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <FileText size={14} /> Voir ma facture PDF
            </button>
            <button onClick={() => router.push('/dashboard')}
              style={{ width: '100%', background: 'transparent', color: '#64748B', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <ArrowLeft size={14} /> Retour au dashboard
            </button>
          </div>
        </motion.div>

        <p style={{ fontSize: 11, color: '#CBD5E1', marginTop: 20, lineHeight: 1.6, textAlign: 'center' }}>
          Un email de confirmation a été envoyé à <strong>{profile?.email}</strong>
        </p>
      </div>
    </div>
  )
}

export default function PaiementSuccess() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: `2px solid ${BRAND}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <PaiementSuccessContent />
    </Suspense>
  )
}