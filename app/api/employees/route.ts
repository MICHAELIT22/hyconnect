import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const department = searchParams.get('department') || ''
  const status = searchParams.get('status') || ''
  const sex = searchParams.get('sex') || ''
  const limit = parseInt(searchParams.get('limit') || '500')

  const sb = createAdminClient()
  let query = sb.from('Employee').select(
    'id, matricule, firstName, lastName, email, phone1, position, department, status, sex, birthDate, hireDate, photoPath'
  ).order('createdAt', { ascending: false }).limit(limit)

  if (department) query = query.eq('department', department)
  if (status) query = query.eq('status', status)
  if (sex) query = query.eq('sex', sex)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const empIds = (data || []).map((e: any) => e.id)
  let contractMap: Record<number, { type: string }[]> = {}
  if (empIds.length > 0) {
    const { data: contracts } = await sb
      .from('Contract')
      .select('employeeId, type, status')
      .in('employeeId', empIds)
      .eq('status', 'ACTIVE')
    for (const c of contracts ?? []) {
      if (!contractMap[c.employeeId]) contractMap[c.employeeId] = []
      contractMap[c.employeeId].push({ type: c.type })
    }
  }

  let employees = (data || []).map((e: any) => ({
    ...e,
    contracts: (contractMap[e.id] || []).slice(0, 1),
  }))

  if (search) {
    const q = search.toLowerCase()
    employees = employees.filter((e: any) =>
      e.firstName?.toLowerCase().includes(q) ||
      e.lastName?.toLowerCase().includes(q) ||
      e.matricule?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.position?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q)
    )
  }

  return NextResponse.json(employees)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const data = await req.json()
  const sb = createAdminClient()

  // Only pass fields that exist in the Employee table (filter out contract/form-only fields)
  const {
    contractType: _ct, contractStartDate: _csd, contractEndDate: _ced,
    trialPeriod: _tp, workerCategory: _wc, annualLeaveDays: _ald,
    currency: _cur, language: _lang, sendInvite: _si,
    ...employeeFields
  } = data

  const employeePayload = {
    ...employeeFields,
    birthDate: data.birthDate || null,
    hireDate: data.hireDate || null,
    probationEndDate: data.probationEndDate || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const { data: emp, error } = await sb.from('Employee').insert([employeePayload]).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(emp, { status: 201 })
}
