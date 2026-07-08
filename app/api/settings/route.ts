import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, requireRole } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { searchParams } = new URL(req.url)
  const section = searchParams.get('section') || 'company'

  if (section === 'users') {
    const { data: users, error } = await sb
      .from('User')
      .select('id,username,role,displayName,department,createdAt')
      .order('createdAt', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(users)
  }

  if (section === 'roles') {
    return NextResponse.json(['ADMIN', 'RH', 'ASSISTANT', 'STAFF'])
  }

  const keys: Record<string, string[]> = {
    company: [
      'company_name', 'company_nif', 'company_social_security',
      'company_country', 'company_currency',
      'company_address', 'company_address2', 'company_city', 'company_region', 'company_postal',
      'company_phone', 'company_email', 'company_website',
      'company_contact_name', 'company_contact_title', 'company_contact_phone', 'company_contact_email',
      'company_logo',
    ],
    salary: ['cnss_rate', 'cnss_employer_rate', 'tax_rate', 'min_wage', 'payroll_day'],
    leaves: ['leave_annual_days', 'leave_sick_days', 'leave_maternity_days', 'leave_notice_days', 'leave_carryover'],
    departments: ['departments_list'],
    branches: ['branches_list'],
    bonuses: ['bonus_13th', 'bonus_performance', 'bonus_transport_base'],
  }

  const settingKeys = keys[section] || []
  const { data: settings, error } = await sb
    .from('Setting')
    .select('key,value')
    .in('key', settingKeys)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result: Record<string, string> = {}
  for (const s of settings ?? []) {
    result[s.key] = s.value
  }

  return NextResponse.json(result)
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(['ADMIN', 'RH'])
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { section, data } = await req.json()

  if (section === 'users_password') {
    const { userId, newPassword } = data
    const hashed = await bcrypt.hash(newPassword, 10)

    const { data: user, error: fetchErr } = await sb
      .from('User')
      .select('id,username')
      .eq('id', userId)
      .single()

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

    const { error: updateErr } = await sb
      .from('User')
      .update({ password: hashed, updatedAt: new Date().toISOString() })
      .eq('id', userId)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    // Also update in Supabase Auth
    if (user) {
      const email = `${user.username}@hyconnect.local`
      const { data: { users } } = await sb.auth.admin.listUsers()
      const supaUser = users.find(u => u.email === email)
      if (supaUser) {
        await sb.auth.admin.updateUserById(supaUser.id, { password: newPassword })
      }
    }

    return NextResponse.json({ success: true })
  }

  // Generic settings save — upsert each key (Setting table has only key + value)
  const entries = Object.entries(data as Record<string, string>)
  if (entries.length === 0) return NextResponse.json({ success: true })

  const upsertRows = entries.map(([key, value]) => ({
    key,
    value: String(value ?? ''),
  }))

  const { error } = await sb
    .from('Setting')
    .upsert(upsertRows, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['ADMIN'])
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { action, data } = await req.json()

  if (action === 'create_user') {
    const { username, password, role, displayName, department } = data
    const hashed = await bcrypt.hash(password, 10)
    const email = `${username}@hyconnect.local`

    const { error: authErr } = await sb.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { display_name: displayName || username },
    })
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

    const { data: user, error: dbErr } = await sb
      .from('User')
      .insert([{
        username,
        password: hashed,
        role,
        displayName,
        department,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }])
      .select()
      .single()

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

    return NextResponse.json(user, { status: 201 })
  }

  if (action === 'delete_user') {
    const { userId } = data

    const { data: user, error: fetchErr } = await sb
      .from('User')
      .select('id,username')
      .eq('id', userId)
      .single()

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

    if (user) {
      const email = `${user.username}@hyconnect.local`
      const { data: { users } } = await sb.auth.admin.listUsers()
      const supaUser = users.find(u => u.email === email)
      if (supaUser) await sb.auth.admin.deleteUser(supaUser.id)

      const { error: delErr } = await sb.from('User').delete().eq('id', userId)
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (action === 'reset_employee_data') {
    const authCheck = await requireRole(['ADMIN'])
    if (authCheck instanceof NextResponse) return authCheck

    await sb.from('Attendance').delete().neq('id', 0)
    await sb.from('Leave').delete().neq('id', 0)
    await sb.from('MedicalVisit').delete().neq('id', 0)
    await sb.from('Training').delete().neq('id', 0)
    await sb.from('Document').delete().neq('id', 0)
    await sb.from('Contract').delete().neq('id', 0)
    await sb.from('PayrollCycleEntry').delete().neq('id', 0)
    await sb.from('PayrollCycle').delete().neq('id', 0)
    await sb.from('Employee').delete().neq('id', 0)

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
}
