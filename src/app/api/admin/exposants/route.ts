// src/app/api/admin/exposants/route.ts
// ═════════════════════════════════════════════════════════════
// PULSEMARKET — Admin: Liste des exposants
// ═════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    const { supabase } = admin

    const { searchParams } = new URL(req.url)
    const plan = searchParams.get('plan') // free | pro | null (tous)
    const search = searchParams.get('search')?.trim().substring(0, 200)

    let query = supabase
      .from('profiles')
      .select('id, email, full_name, plan, subscription_status, created_at, stripe_customer_id')
      .eq('role', 'exposant')
      .order('created_at', { ascending: false })

    if (plan) query = query.eq('plan', plan)
    if (search) query = query.ilike('full_name', `%${search}%`)

    const { data, error } = await query.limit(200)

    if (error) {
      console.error('[admin/exposants] Query error:', error)
      return NextResponse.json({ error: 'Erreur requête' }, { status: 500 })
    }

    return NextResponse.json({ exposants: data || [] })

  } catch (err: any) {
    console.error('[admin/exposants] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}