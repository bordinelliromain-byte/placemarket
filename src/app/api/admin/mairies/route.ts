// src/app/api/admin/mairies/route.ts
// ═════════════════════════════════════════════════════════════
// PULSEMARKET — Admin: Liste des mairies
// ═════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    const { supabase } = admin

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') // pending | approved | rejected | null (tous)
    const search = searchParams.get('search')?.trim().substring(0, 200)

    let query = supabase
      .from('profiles')
      .select('id, email, full_name, organisation_name, organisation_siret, organisateur_status, created_at, justificatif_url, plan')
      .eq('role', 'organisateur')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('organisateur_status', status)
    if (search) query = query.ilike('organisation_name', `%${search}%`)

    const { data, error } = await query.limit(200)

    if (error) {
      console.error('[admin/mairies] Query error:', error)
      return NextResponse.json({ error: 'Erreur requête' }, { status: 500 })
    }

    return NextResponse.json({ mairies: data || [] })

  } catch (err: any) {
    console.error('[admin/mairies] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}