import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { id } = await params
  const empId = parseInt(id)

  // Get all payroll entries for this employee, joined with cycle info
  const { data: entries, error } = await sb
    .from('PayrollCycleEntry')
    .select('*, PayrollCycle(id,month,year,status)')
    .eq('employeeId', empId)
    .order('cycleId', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const normalized = (entries ?? []).map((e: any) => ({
    ...e,
    cycle: e.PayrollCycle ?? null,
    PayrollCycle: undefined,
  }))

  return NextResponse.json(normalized)
}
