import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const type = searchParams.get('type') || ''
  const status = searchParams.get('status') || ''
  const employeeId = searchParams.get('employeeId')

  let query = sb
    .from('Contract')
    .select('*, Employee(id,firstName,lastName,matricule,photoPath)')
    .order('createdAt', { ascending: false })

  if (search) {
    const { data: empData } = await sb
      .from('Employee')
      .select('id')
      .or(`firstName.ilike.%${search}%,lastName.ilike.%${search}%`)
    const empIds = (empData ?? []).map((e: { id: number }) => e.id)
    const orParts = [
      `contractNo.ilike.%${search}%`,
      ...(empIds.length ? [`employeeId.in.(${empIds.join(',')})`] : []),
    ]
    query = query.or(orParts.join(','))
  }

  if (type) query = query.eq('type', type)
  if (status) query = query.eq('status', status)
  if (employeeId) query = query.eq('employeeId', parseInt(employeeId))

  const { data: contracts, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const normalized = (contracts || []).map((c: any) => ({
    ...c,
    employee: c.Employee ?? null,
    Employee: undefined,
  }))

  return NextResponse.json(normalized)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const data = await req.json()

  // Only pass fields that exist in the Contract table
  const contractPayload = {
    contractNo: data.contractNo,
    employeeId: data.employeeId,
    type: data.type,
    position: data.position,
    department: data.department,
    salary: data.salary ?? 0,
    bonus: data.bonus ?? null,
    startDate: new Date(data.startDate).toISOString(),
    endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
    trialEndDate: data.trialEndDate ? new Date(data.trialEndDate).toISOString() : null,
    workHours: data.workHours ?? null,
    workerCategory: data.workerCategory ?? null,
    annualLeaveDays: data.annualLeaveDays ?? null,
    currency: data.currency ?? null,
    language: data.language ?? null,
    payFrequency: data.payFrequency ?? null,
    workDaysPerWeek: data.workDaysPerWeek ?? null,
    status: data.status ?? 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const { data: contract, error } = await sb
    .from('Contract')
    .insert([contractPayload])
    .select('*, Employee(id,firstName,lastName,matricule)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(contract, { status: 201 })
}
