import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employeeId')
  const category = searchParams.get('category') || ''
  const type = searchParams.get('type') || ''

  if (type === 'stats') {
    let baseQuery = sb.from('Training').select('id,cost,certificate,category')
    if (employeeId) baseQuery = baseQuery.eq('employeeId', parseInt(employeeId))
    if (category) baseQuery = baseQuery.eq('category', category)

    const { data: allTrainings, error } = await baseQuery
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = allTrainings ?? []
    const total = rows.length
    const withCert = rows.filter((t: { certificate: boolean }) => t.certificate).length
    const totalCost = rows.reduce((sum: number, t: { cost?: number | null }) => sum + (t.cost || 0), 0)

    const byCategoryMap: Record<string, number> = {}
    for (const t of rows) {
      const cat = (t as { category?: string }).category || 'N/A'
      byCategoryMap[cat] = (byCategoryMap[cat] || 0) + 1
    }
    const byCategory = Object.entries(byCategoryMap).map(([cat, _count]) => ({ category: cat, _count }))

    return NextResponse.json({ total, withCert, totalCost, byCategory })
  }

  if (type === 'export') {
    let query = sb
      .from('Training')
      .select('*, Employee(firstName,lastName,matricule,department)')
      .order('date', { ascending: false })

    if (employeeId) query = query.eq('employeeId', parseInt(employeeId))
    if (category) query = query.eq('category', category)

    const { data: trainings, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const csv = [
      'Matricule,Nom,Prénom,Département,Formation,Organisme,Date,Durée,Coût,Certificat',
      ...(trainings ?? []).map((t: any) => {
        const emp = t.Employee ?? t.employee ?? {}
        return `${emp.matricule || ''},${emp.lastName || ''},${emp.firstName || ''},${emp.department || ''},${t.title},${t.organization},${t.date?.split('T')[0] ?? ''},${t.duration || ''},${t.cost || ''},${t.certificate ? 'Oui' : 'Non'}`
      }),
    ].join('\n')
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=formations.csv' } })
  }

  let query = sb
    .from('Training')
    .select('*, Employee(id,firstName,lastName,matricule,department)')
    .order('date', { ascending: false })

  if (employeeId) query = query.eq('employeeId', parseInt(employeeId))
  if (category) query = query.eq('category', category)

  const { data: trainings, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const normalized = (trainings || []).map((t: any) => ({
    ...t,
    employee: t.Employee ?? null,
    Employee: undefined,
  }))

  return NextResponse.json(normalized)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const data = await req.json()

  const { data: training, error } = await sb
    .from('Training')
    .insert([{
      ...data,
      date: new Date(data.date).toISOString(),
      expirationDate: data.expirationDate ? new Date(data.expirationDate).toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }])
    .select('*, Employee(id,firstName,lastName)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(training, { status: 201 })
}
