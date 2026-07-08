import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employeeId')
  const type = searchParams.get('type') || ''

  if (type === 'stats') {
    const { data: allVisits, error: allErr } = await sb.from('MedicalVisit').select('id,result')
    if (allErr) return NextResponse.json({ error: allErr.message }, { status: 500 })

    const total = allVisits?.length ?? 0
    const byResultMap: Record<string, number> = {}
    for (const v of allVisits ?? []) {
      const r = v.result || 'N/A'
      byResultMap[r] = (byResultMap[r] || 0) + 1
    }
    const byResult = Object.entries(byResultMap).map(([result, _count]) => ({ result, _count }))

    const now = new Date().toISOString()
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: upcoming, error: upErr } = await sb
      .from('MedicalVisit')
      .select('*, Employee(firstName,lastName,department)')
      .gte('nextVisit', now)
      .lte('nextVisit', in30)
      .order('nextVisit', { ascending: true })
      .limit(5)

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    return NextResponse.json({ total, byResult, upcoming })
  }

  if (type === 'export') {
    let query = sb
      .from('MedicalVisit')
      .select('*, Employee(firstName,lastName,matricule,department)')
      .order('date', { ascending: false })

    if (employeeId) query = query.eq('employeeId', parseInt(employeeId))

    const { data: visits, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const csv = [
      'Matricule,Nom,Prénom,Département,Date,Médecin,Centre,Résultat,Prochaine visite',
      ...(visits ?? []).map((v: any) => {
        const emp = v.Employee ?? v.employee ?? {}
        return `${emp.matricule || ''},${emp.lastName || ''},${emp.firstName || ''},${emp.department || ''},${v.date?.split('T')[0] ?? ''},${v.doctor || ''},${v.center || ''},${v.result || ''},${v.nextVisit ? v.nextVisit.split('T')[0] : ''}`
      }),
    ].join('\n')
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=visites-medicales.csv' } })
  }

  let query = sb
    .from('MedicalVisit')
    .select('*, Employee(id,firstName,lastName,matricule,department)')
    .order('date', { ascending: false })

  if (employeeId) query = query.eq('employeeId', parseInt(employeeId))

  const { data: visits, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const normalized = (visits || []).map((v: any) => ({
    ...v,
    employee: v.Employee ?? null,
    Employee: undefined,
  }))

  return NextResponse.json(normalized)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const data = await req.json()

  const { data: visit, error } = await sb
    .from('MedicalVisit')
    .insert([{
      ...data,
      date: new Date(data.date).toISOString(),
      nextVisit: data.nextVisit ? new Date(data.nextVisit).toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }])
    .select('*, Employee(id,firstName,lastName)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(visit, { status: 201 })
}
