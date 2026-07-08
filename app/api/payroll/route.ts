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
  const position = emp.positionAllowance || 0
  const gross = base + transport + housing + position

  // CNSS: 3.2% employee share (Côte d'Ivoire rates)
  const cnss = Math.round(gross * 0.032 * 100) / 100
  // Income tax simplified bracket
  const taxableIncome = gross - cnss
  let tax = 0
  if (taxableIncome > 600000) tax = taxableIncome * 0.25
  else if (taxableIncome > 300000) tax = taxableIncome * 0.20
  else if (taxableIncome > 150000) tax = taxableIncome * 0.15
  else if (taxableIncome > 75000) tax = taxableIncome * 0.10
  tax = Math.round(tax * 100) / 100

  const net = Math.round((gross - cnss - tax) * 100) / 100

  return { base, transport, housing, position, gross, cnss, tax, net }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { searchParams } = new URL(req.url)
  const department = searchParams.get('department') || ''
  const previewOnly = searchParams.get('previewOnly') === 'true'

  let query = sb
    .from('Employee')
    .select('id,matricule,firstName,lastName,department,position,baseSalary,transportAllowance,housingAllowance,positionAllowance')
    .eq('status', 'ACTIVE')
    .order('lastName', { ascending: true })

  if (department) query = query.eq('department', department)

  const { data: employees, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filter employees with active contracts
  const empIds = (employees ?? []).map((e: any) => e.id)
  let activeEmpIds: number[] = empIds
  if (empIds.length > 0) {
    const { data: contracts } = await sb
      .from('Contract')
      .select('employeeId')
      .eq('status', 'ACTIVE')
      .in('employeeId', empIds)
    if (contracts && contracts.length > 0) {
      activeEmpIds = [...new Set(contracts.map((c: any) => c.employeeId))]
    }
  }

  const eligible = (employees ?? []).filter((e: any) => activeEmpIds.includes(e.id))

  const payroll = eligible.map((emp: any) => ({
    ...emp,
    ...computePayroll(emp),
  }))

  const totals = payroll.reduce(
    (acc, p) => ({
      gross: acc.gross + p.gross,
      cnss: acc.cnss + p.cnss,
      tax: acc.tax + p.tax,
      net: acc.net + p.net,
    }),
    { gross: 0, cnss: 0, tax: 0, net: 0 }
  )

  if (previewOnly) return NextResponse.json({ payroll: payroll.map((p: any) => ({ id: p.id })) })
  return NextResponse.json({ payroll, totals })
}
