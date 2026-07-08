import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/auth'

// GET /api/auth/me — profil utilisateur connecté
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const sb = createAdminClient()
  const { data } = await sb
    .from('User')
    .select('id,username,role,displayName,department,photoPath')
    .eq('id', user.id)
    .single()

  return NextResponse.json(data)
}

// PUT /api/auth/me — modifier son propre profil
export async function PUT(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { displayName, department } = await req.json()
  const sb = createAdminClient()

  const { data, error } = await sb
    .from('User')
    .update({ displayName, department })
    .eq('id', user.id)
    .select('id,username,role,displayName,department,photoPath')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
