import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

// POST /api/auth — login
export async function POST(req: NextRequest) {
  const { action, username, password, displayName, role, department } = await req.json()

  if (action === 'login') {
    const supabase = await createClient()
    const email = username.includes('@') ? username : `${username}@hyconnect.local`

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })

    const sb = createAdminClient()
    const { data: dbUser } = await sb
      .from('User')
      .select('id,username,role,displayName,department,photoPath')
      .eq('username', username)
      .single()

    return NextResponse.json({ user: dbUser, session: data.session })
  }

  if (action === 'register') {
    const sb = createAdminClient()
    const email = `${username}@hyconnect.local`
    const hashed = await bcrypt.hash(password, 10)

    const { error: authErr } = await sb.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { display_name: displayName || username },
    })
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

    const { data: dbUser, error: dbErr } = await sb
      .from('User')
      .insert([{ username, password: hashed, role: role || 'STAFF', displayName, department, createdAt: new Date().toISOString() }])
      .select()
      .single()
    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

    return NextResponse.json({ user: dbUser }, { status: 201 })
  }

  return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
}

// GET /api/auth — current user profile
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const sb = createAdminClient()
  const { data: dbUser } = await sb
    .from('User')
    .select('id,username,role,displayName,department,photoPath')
    .eq('username', user.email!.replace('@hyconnect.local', ''))
    .single()

  return NextResponse.json(dbUser)
}
