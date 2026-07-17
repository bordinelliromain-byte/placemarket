// src/lib/adminAuth.ts
// ═════════════════════════════════════════════════════════════
// PULSEMARKET — Helper d'auth admin pour les routes /api/admin/*
// Le frontend envoie le token de session Supabase dans le header
// Authorization: Bearer <access_token>. On vérifie ce token puis
// on check le flag is_admin sur le profil correspondant.
// ═════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export async function requireAdmin(req: NextRequest): Promise<{
  supabase: SupabaseClient
  userId: string
} | null> {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('[adminAuth] Env vars manquantes')
    return null
  }

  // Client admin (service role) — utilisé à la fois pour valider le token
  // et pour interroger les données ensuite.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .single()

  if (!profile?.is_admin) return null

  return { supabase, userId: userData.user.id }
}