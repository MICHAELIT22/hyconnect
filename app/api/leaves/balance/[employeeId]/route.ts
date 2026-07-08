import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { employeeId } = await params
  const empId = parseInt(employeeId)

  const currentYear = new Date().getFullYear()
  const startOfYear = new Date(currentYear, 0, 1).toISOString()

  const { data: leaves, error } = await sb
    .from('Leave')
    .select('*')
    .eq('employeeId', empId)
    .eq('status', 'APPROVED')
    .gte('startDate', startOfYear)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const usedDays: Record<string, number> = {}
  for (const leave of leaves ?? []) {
    const days = Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    usedDays[leave.type] = (usedDays[leave.type] || 0) + days
  }

  return NextResponse.json({
    annual: { total: 26, used: usedDays['ANNUAL'] || 0, remaining: 26 - (usedDays['ANNUAL'] || 0) },
    sick: { total: 15, used: usedDays['SICK'] || 0, remaining: 15 - (usedDays['SICK'] || 0) },
    maternity: { total: 98, used: usedDays['MATERNITY'] || 0, remaining: 98 - (usedDays['MATERNITY'] || 0) },
    other: usedDays,
  })
}
