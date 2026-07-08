import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

function computePayroll(emp: {
  baseSalary: number | null
  transportAllowance: number | null
  housingAllowance: number | null
  positionAllowance: number | null
}) {
  const base = emp.baseSalary || 0
  const transport = emp.transportAllowance || 0
  const housing = emp.housingAllowance || 0
  const positionAl = emp.positionAllowance || 0
  const gross = base + transport + housing + positionAl
  const cnss = Math.round(gross * 0.032 * 100) / 100
  const taxableIncome = gross - cnss
  let tax = 0
  if (taxableIncome > 600000) tax = taxableIncome * 0.25
  else if (taxableIncome > 300000) tax = taxableIncome * 0.20
  else if (taxableIncome > 150000) tax = taxableIncome * 0.15
  else if (taxableIncome > 75000) tax = taxableIncome * 0.10
  tax = Math.round(tax * 100) / 100
  const net = Math.round((gross - cnss - tax) * 100) / 100
  return { base, transport, housing, positionAllowance: positionAl, gross, cnss, tax, net }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { data, error } = await sb
    .from('PayrollCycle')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { month, year } = await req.json()

  // Check if cycle already exists
  const { data: existing } = await sb
    .from('PayrollCycle')
    .select('id')
    .eq('month', month)
    .eq('year', year)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Un cycle existe déjà pour cette période' }, { status: 409 })
  }

  // Fetch active employees with active contracts
  const { data: employees, error: empErr } = await sb
    .from('Employee')
    .select('id,matricule,firstName,lastName,department,position,baseSalary,transportAllowance,housingAllowance,positionAllowance')
    .eq('status', 'ACTIVE')
    .order('lastName', { ascending: true })

  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 })

  // Filter employees with at least one active contract
  const empIds = (employees ?? []).map((e: any) => e.id)
  let activeEmpIds: number[] = []
  if (empIds.length > 0) {
    const { data: contracts } = await sb
      .from('Contract')
      .select('employeeId')
      .eq('status', 'ACTIVE')
      .in('employeeId', empIds)
    activeEmpIds = [...new Set((contracts ?? []).map((c: any) => c.employeeId))]
  }

  const eligible = (employees ?? []).filter((e: any) => activeEmpIds.includes(e.id))

  const entries = eligible.map((emp: any) => ({ ...emp, ...computePayroll(emp) }))

  const totals = entries.reduce(
    (acc, e) => ({ gross: acc.gross + e.gross, cnss: acc.cnss + e.cnss, tax: acc.tax + e.tax, net: acc.net + e.net }),
    { gross: 0, cnss: 0, tax: 0, net: 0 }
  )

  // Create cycle
  const { data: cycle, error: cycleErr } = await sb
    .from('PayrollCycle')
    .insert([{
      month,
      year,
      status: 'DRAFT',
      totalGross: Math.round(totals.gross * 100) / 100,
      totalCnss: Math.round(totals.cnss * 100) / 100,
      totalTax: Math.round(totals.tax * 100) / 100,
      totalNet: Math.round(totals.net * 100) / 100,
      updatedAt: new Date().toISOString(),
    }])
    .select()
    .single()

  if (cycleErr) return NextResponse.json({ error: cycleErr.message }, { status: 500 })

  // Insert entries
  if (entries.length > 0) {
    const entryRows = entries.map((e: any) => ({
      cycleId: cycle.id,
      employeeId: e.id,
      matricule: e.matricule,
      firstName: e.firstName,
      lastName: e.lastName,
      department: e.department || '',
      position: e.position || '',
      base: e.base,
      transport: e.transport,
      housing: e.housing,
      positionAllowance: e.positionAllowance,
      gross: e.gross,
      cnss: e.cnss,
      tax: e.tax,
      net: e.net,
    }))
    const { error: entryErr } = await sb.from('PayrollCycleEntry').insert(entryRows)
    if (entryErr) return NextResponse.json({ error: entryErr.message }, { status: 500 })
  }

  return NextResponse.json({ ...cycle, entryCount: entries.length }, { status: 201 })
}
