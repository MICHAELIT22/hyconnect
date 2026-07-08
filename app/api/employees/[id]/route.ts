import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { id } = await params
  const empId = parseInt(id)

  const { data: employee, error } = await sb.from('Employee').select('*').eq('id', empId).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!employee) return NextResponse.json({ error: 'Employé non trouvé' }, { status: 404 })

  const [contracts, leaves, attendance, trainings, medicals, documents] = await Promise.all([
    sb.from('Contract').select('*').eq('employeeId', empId).order('createdAt', { ascending: false }),
    sb.from('Leave').select('*').eq('employeeId', empId).order('createdAt', { ascending: false }).limit(10),
    sb.from('Attendance').select('id,date,checkIn,checkOut,isLate,absence,overtime').eq('employeeId', empId).order('date', { ascending: false }).limit(30),
    sb.from('Training').select('*').eq('employeeId', empId).order('date', { ascending: false }),
    sb.from('MedicalVisit').select('*').eq('employeeId', empId).order('date', { ascending: false }),
    sb.from('Document').select('*').eq('employeeId', empId).order('createdAt', { ascending: false }),
  ])

  return NextResponse.json({
    ...employee,
    contracts: contracts.data ?? [],
    leaves: leaves.data ?? [],
    attendances: attendance.data ?? [],
    trainings: trainings.data ?? [],
    medicals: medicals.data ?? [],
    documents: documents.data ?? [],
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { id } = await params
  const data = await req.json()

  // Strip all non-Employee-table fields (relations, contract fields, form-only)
  const {
    contractType: _ct, contractStartDate: _csd, contractEndDate: _ced,
    trialPeriod: _tp, workerCategory: _wc, annualLeaveDays: _ald,
    currency: _cur, language: _lang, sendInvite: _si,
    contracts: _contracts, leaves: _leaves, attendances: _att,
    trainings: _trainings, medicals: _med, documents: _docs,
    ...employeeFields
  } = data

  const { data: employee, error } = await sb
    .from('Employee')
    .update({
      ...employeeFields,
      birthDate: data.birthDate ? new Date(data.birthDate).toISOString() : undefined,
      hireDate: data.hireDate ? new Date(data.hireDate).toISOString() : undefined,
      probationEndDate: data.probationEndDate ? new Date(data.probationEndDate).toISOString() : null,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', parseInt(id))
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(employee)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { id } = await params

  const { error } = await sb.from('Employee').delete().eq('id', parseInt(id))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
