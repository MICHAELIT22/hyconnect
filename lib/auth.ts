import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export type AuthUser = {
  id: number
  username: string
  role: string
  displayName: string | null
  department: string | null
  photoPath: string | null
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const username = user.email?.replace('@hyconnect.local', '') ?? ''
  const admin = createAdminClient()
  const { data } = await admin.from('User').select('id,username,role,displayName,department,photoPath').eq('username', username).single()
  return data as AuthUser | null
}

export async function requireAuth(): Promise<AuthUser | NextResponse> {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  return user
}

export async function requireRole(roles: string[]): Promise<AuthUser | NextResponse> {
  const result = await requireAuth()
  if (result instanceof NextResponse) return result
  if (!roles.includes(result.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  return result
}
