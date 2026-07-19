'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Map, FileText, Receipt, Settings, LogOut,
  CalendarCheck, QrCode, Users, MapPin, Menu, X,
  Share2, Star
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

const NAV_EXPOSANT = [
  { icon: <LayoutDashboard size={15} />, label: 'Dashboard', path: '/dashboard' },
  { icon: <CalendarCheck size={15} />, label: 'Mes marchés', path: '/dashboard/mes-marches' },
  { icon: <Map size={15} />, label: 'Marchés', path: '/dashboard/evenements' },
  { icon: <FileText size={15} />, label: 'Documents', path: '/dashboard/profil' },
  { icon: <Star size={15} />, label: 'Booster', path: '/dashboard/boost' },
  { icon: <Receipt size={15} />, label: 'Factures', path: '/dashboard/factures' },
  { icon: <Settings size={15} />, label: 'Paramètres', path: '/dashboard/parametres' },
]

const NAV_ORGANISATEUR = [
  { icon: <LayoutDashboard size={15} />, label: 'Dashboard', path: '/dashboard' },
  { icon: <Map size={15} />, label: 'Marchés', path: '/dashboard/creer-evenement' },
  { icon: <FileText size={15} />, label: 'Candidatures', path: '/dashboard/candidatures' },
  { icon: <QrCode size={15} />, label: 'Scanner', path: '/dashboard/organisateur/scanner' },
  { icon: <Receipt size={15} />, label: 'Trésorerie', path: '/dashboard/tresorerie' },
  { icon: <Users size={15} />, label: 'Placiers', path: '/dashboard/organisateur/placiers' },
  { icon: <Settings size={15} />, label: 'Paramètres', path: '/dashboard/parametres/mairie' },
]

interface SidebarProps {
  profile: any
}

export default function Sidebar({ profile }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])

  const NAV_ITEMS = profile?.role === 'organisateur' ? NAV_ORGANISATEUR : NAV_EXPOSANT

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard' || pathname === '/dashboard/organisateur'
    return pathname.startsWith(path)
  }

  const handleNav = (path: string) => {
    router.push(path)
    setOpen(false)
  }

  return (
    <>
      {isMobile && !open && (
        <button onClick={() => setOpen(true)}
          style={{ position: 'fixed', top: 14, left: 16, zIndex: 50, background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Menu size={18} color="white" />
        </button>
      )}

      {isMobile && open && (
        <div onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 35, backdropFilter: 'blur(2px)' }} />
      )}

      <aside style={{
        width: 220, background: '#020617', display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: isMobile ? (open ? 0 : -240) : 0, bottom: 0,
        zIndex: 40, transition: 'left 0.3s ease',
      }}>
        {/* ✅ Logo seul - sans texte */}
        <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
            <img src="/logo-pulsemarket2.svg" alt="PulseMarket"
              style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
          </div>
          {isMobile && (
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}>
              <X size={18} />
            </button>
          )}
        </div>

        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 10px', marginBottom: 4 }}>Navigation</p>
          {NAV_ITEMS.map((item) => (
            <button key={item.label} onClick={() => handleNav(item.path)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: isActive(item.path) ? 'rgba(79,70,229,0.15)' : 'transparent',
                color: isActive(item.path) ? '#818CF8' : '#64748B',
                fontSize: 13, fontWeight: isActive(item.path) ? 600 : 400,
                marginBottom: 2, textAlign: 'left', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isActive(item.path)) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { if (!isActive(item.path)) e.currentTarget.style.background = 'transparent' }}>
              {item.icon}{item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ padding: '8px 10px', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#CBD5E1' }}>{profile?.full_name}</p>
              {profile?.role === 'organisateur' && (
                <span style={{ fontSize: 9, fontWeight: 700, background: '#4F46E5', color: 'white', padding: '1px 6px', borderRadius: 100 }}>VÉRIFIÉ</span>
              )}
              {profile?.plan === 'pro' && profile?.role !== 'organisateur' && (
                <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(251,191,36,0.15)', color: '#FBBF24', padding: '1px 6px', borderRadius: 100, border: '1px solid rgba(251,191,36,0.3)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Star size={8} style={{ fill: '#FBBF24' }} /> PRO
                </span>
              )}
            </div>
            <p style={{ fontSize: 11, color: '#475569' }}>
              {profile?.role === 'organisateur' ? 'Administration municipale' : 'Espace exposant'}
            </p>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#64748B', fontSize: 12 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <LogOut size={13} /> Déconnexion
          </button>
        </div>
      </aside>
    </>
  )
}