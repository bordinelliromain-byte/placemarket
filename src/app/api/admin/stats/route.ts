// src/app/api/admin/stats/route.ts
// ═════════════════════════════════════════════════════════════
// PULSEMARKET — Admin Stats
// Chiffres globaux pour le dashboard CRM interne.
// ═════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    const { supabase } = admin

    // ─── Mairies par statut ───
    const { data: mairies } = await supabase
      .from('profiles')
      .select('organisateur_status')
      .eq('role', 'organisateur')

    const mairieStats = {
      total: mairies?.length || 0,
      pending: mairies?.filter(m => m.organisateur_status === 'pending').length || 0,
      approved: mairies?.filter(m => m.organisateur_status === 'approved').length || 0,
      rejected: mairies?.filter(m => m.organisateur_status === 'rejected').length || 0,
    }

    // ─── Exposants par plan ───
    const { data: exposants } = await supabase
      .from('profiles')
      .select('plan')
      .eq('role', 'exposant')

    const exposantStats = {
      total: exposants?.length || 0,
      free: exposants?.filter(e => e.plan === 'free' || !e.plan).length || 0,
      pro: exposants?.filter(e => e.plan === 'pro').length || 0,
    }

    // ─── MRR estimé (Pro exposants — mairies pas encore en Stripe LIVE) ───
    const mrrEstimate = exposantStats.pro * 20

    // ─── Inscriptions des 30 derniers jours ───
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentSignups } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: true })

    const signupsByDay: Record<string, number> = {}
    for (const s of recentSignups || []) {
      const day = s.created_at?.split('T')[0]
      if (day) signupsByDay[day] = (signupsByDay[day] || 0) + 1
    }

    return NextResponse.json({
      mairies: mairieStats,
      exposants: exposantStats,
      mrrEstimate,
      signupsByDay,
      signupsLast30Days: recentSignups?.length || 0,
    })

  } catch (err: any) {
    console.error('[admin/stats] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}