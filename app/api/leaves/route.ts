import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || ''
  const status = searchParams.get('status') || ''
  const department = searchParams.get('department') || ''
  const employeeId = searchParams.get('employeeId')

  let query = sb
    .from('Leave')
    .select('*, Employee(id,firstName,lastName,matricule,department,photoPath)')
    .order('createdAt', { ascending: false })

  if (type) query = query.eq('type', type)
  if (status) query = query.eq('status', status)
  if (employeeId) query = query.eq('employeeId', parseInt(employeeId))

  if (department) {
    const { data: empData } = await sb.from('Employee').select('id').eq('department', department)
    const empIds = (empData ?? []).map((e: { id: number }) => e.id)
    if (empIds.length === 0) return NextResponse.json([])
    query = query.in('employeeId', empIds)
  }

  const { data: leaves, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const normalized = (leaves || []).map((l: any) => ({
    ...l,
    employee: l.Employee ?? null,
    Employee: undefined,
  }))

  return NextResponse.json(normalized)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const data = await req.json()

  const { data: leave, error } = await sb
    .from('Leave')
    .insert([{
      ...data,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }])
    .select('*, Employee(id,firstName,lastName)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(leave, { status: 201 })
}
