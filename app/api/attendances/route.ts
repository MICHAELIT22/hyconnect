import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employeeId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = sb
    .from('Attendance')
    .select('*, Employee(id,firstName,lastName,matricule,department)', { count: 'exact' })
    .order('date', { ascending: false })
    .range(from, to)

  if (employeeId) query = query.eq('employeeId', parseInt(employeeId))
  if (dateFrom) query = query.gte('date', new Date(dateFrom).toISOString())
  if (dateTo) query = query.lte('date', new Date(dateTo).toISOString())

  const { data: records, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const normalized = (records || []).map((r: any) => ({
    ...r,
    employee: r.Employee ?? null,
    Employee: undefined,
  }))

  return NextResponse.json({ records: normalized, total: count ?? 0 })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const data = await req.json()

  const { data: record, error } = await sb
    .from('Attendance')
    .insert([{
      ...data,
      date: new Date(data.date).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }])
    .select('*, Employee(id,firstName,lastName)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(record, { status: 201 })
}
