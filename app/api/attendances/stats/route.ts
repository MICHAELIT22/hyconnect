import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'today'

  if (type === 'today') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayIso = today.toISOString()
    const tomorrowIso = tomorrow.toISOString()

    const [presentRes, absentRes, lateRes, totalRes] = await Promise.all([
      sb.from('Attendance').select('id', { count: 'exact', head: true }).gte('date', todayIso).lt('date', tomorrowIso).eq('absence', false),
      sb.from('Attendance').select('id', { count: 'exact', head: true }).gte('date', todayIso).lt('date', tomorrowIso).eq('absence', true),
      sb.from('Attendance').select('id', { count: 'exact', head: true }).gte('date', todayIso).lt('date', tomorrowIso).eq('isLate', true),
      sb.from('Employee').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    ])

    const present = presentRes.count ?? 0
    const absent = absentRes.count ?? 0
    const late = lateRes.count ?? 0
    const total = totalRes.count ?? 0

    return NextResponse.json({ present, absent, late, total, notRecorded: total - present - absent })
  }

  if (type === 'repeated-lates') {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: lateRows, error: lateErr } = await sb
      .from('Attendance')
      .select('employeeId')
      .gte('date', thirtyDaysAgo.toISOString())
      .eq('isLate', true)

    if (lateErr) return NextResponse.json({ error: lateErr.message }, { status: 500 })

    const countMap: Record<number, number> = {}
    for (const row of lateRows ?? []) {
      countMap[row.employeeId] = (countMap[row.employeeId] || 0) + 1
    }

    const repeatedIds = Object.entries(countMap)
      .filter(([, count]) => count > 2)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => parseInt(id))

    if (repeatedIds.length === 0) return NextResponse.json([])

    const { data: employees, error: empErr } = await sb
      .from('Employee')
      .select('id,firstName,lastName,department,matricule')
      .in('id', repeatedIds)

    if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 })

    const result = repeatedIds.map(id => ({
      ...(employees ?? []).find((e: { id: number }) => e.id === id),
      lateCount: countMap[id],
    }))

    return NextResponse.json(result)
  }

  // global stats
  const [totalRes, lateRes, absenceRes, overtimeRows] = await Promise.all([
    sb.from('Attendance').select('id', { count: 'exact', head: true }),
    sb.from('Attendance').select('id', { count: 'exact', head: true }).eq('isLate', true),
    sb.from('Attendance').select('id', { count: 'exact', head: true }).eq('absence', true),
    sb.from('Attendance').select('overtime'),
  ])

  const totalRecords = totalRes.count ?? 0
  const lateCount = lateRes.count ?? 0
  const absenceCount = absenceRes.count ?? 0
  const totalOvertime = (overtimeRows.data ?? []).reduce((sum: number, r: { overtime?: number | null }) => sum + (r.overtime || 0), 0)

  return NextResponse.json({ totalRecords, lateCount, absenceCount, totalOvertime })
}
