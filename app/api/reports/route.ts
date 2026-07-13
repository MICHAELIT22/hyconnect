import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'effectifs'
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  const yearStart = new Date(year, 0, 1).toISOString()
  const yearEnd = new Date(year, 11, 31, 23, 59, 59).toISOString()

  // ── EFFECTIFS ──────────────────────────────────────────────────────────────
  if (type === 'effectifs') {
    const [
      { data: employees },
      { data: departedRows },
      { data: contracts },
      { data: hiresThisYear },
    ] = await Promise.all([
      sb.from('Employee').select('id,hireDate,birthDate,department,sex,status,baseSalary').eq('status', 'ACTIVE'),
      sb.from('Employee').select('id').neq('status', 'ACTIVE'),
      sb.from('Contract').select('type,employeeId,workerCategory').eq('status', 'ACTIVE'),
      sb.from('Employee').select('id,hireDate').gte('hireDate', yearStart).lte('hireDate', yearEnd),
    ])

    const emps = employees ?? []
    const total = emps.length
    const departed = (departedRows ?? []).length

    // Rotation rate
    const avgEffectif = total + Math.floor(departed / 2)
    const rotationRate = avgEffectif > 0 ? Math.round((departed / avgEffectif) * 100) : 0

    // Average seniority
    const now = new Date()
    const avgSeniority = total > 0
      ? Math.round(emps.reduce((acc, e) => {
          const yrs = e.hireDate ? (now.getTime() - new Date(e.hireDate).getTime()) / (365.25 * 24 * 3600 * 1000) : 0
          return acc + yrs
        }, 0) / total)
      : 0

    // Average salary
    const salaries = emps.filter((e: any) => e.baseSalary > 0).map((e: any) => e.baseSalary)
    const avgSalary = salaries.length > 0 ? Math.round(salaries.reduce((a: number, b: number) => a + b, 0) / salaries.length) : 0

    // Monthly hires/departures for the year
    const monthlyHires = Array(12).fill(0)
    const monthlyDepartures = Array(12).fill(0)
    for (const e of hiresThisYear ?? []) {
      if (e.hireDate) monthlyHires[new Date(e.hireDate).getMonth()]++
    }

    // By department
    const deptMap: Record<string, number> = {}
    for (const e of emps) {
      const d = e.department || 'Non défini'
      deptMap[d] = (deptMap[d] || 0) + 1
    }

    // By sex
    const sexMap: Record<string, number> = {}
    for (const e of emps) {
      const s = e.sex || 'N/A'
      sexMap[s] = (sexMap[s] || 0) + 1
    }

    // Age pyramid
    const agePyramid: Record<string, number> = { '<25': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 }
    for (const e of emps) {
      if (!e.birthDate) continue
      const age = (now.getTime() - new Date(e.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000)
      if (age < 25) agePyramid['<25']++
      else if (age < 35) agePyramid['25-34']++
      else if (age < 45) agePyramid['35-44']++
      else if (age < 55) agePyramid['45-54']++
      else agePyramid['55+']++
    }

    // Contract types
    const contractTypeMap: Record<string, number> = {}
    for (const c of contracts ?? []) {
      contractTypeMap[c.type] = (contractTypeMap[c.type] || 0) + 1
    }

    // Worker categories
    const catMap: Record<string, number> = {}
    for (const c of contracts ?? []) {
      const cat = c.workerCategory || 'Non défini'
      catMap[cat] = (catMap[cat] || 0) + 1
    }

    // Salary by contract type
    const salaryByType: Record<string, { total: number; count: number }> = {}
    for (const c of contracts ?? []) {
      const emp = emps.find((e: any) => e.id === c.employeeId)
      if (!emp || !emp.baseSalary) continue
      if (!salaryByType[c.type]) salaryByType[c.type] = { total: 0, count: 0 }
      salaryByType[c.type].total += emp.baseSalary
      salaryByType[c.type].count++
    }
    const avgSalaryByType = Object.fromEntries(
      Object.entries(salaryByType).map(([k, v]) => [k, v.count > 0 ? Math.round(v.total / v.count) : 0])
    )

    return NextResponse.json({
      total, departed, rotationRate, avgSeniority, avgSalary,
      monthlyHires, monthlyDepartures,
      deptMap, sexMap, agePyramid, contractTypeMap, catMap, avgSalaryByType,
      hiresCount: (hiresThisYear ?? []).length,
    })
  }

  // ── PAIE ───────────────────────────────────────────────────────────────────
  if (type === 'paie') {
    const [{ data: cycles }, { data: employees }] = await Promise.all([
      sb.from('PayrollCycle').select('id,month,year,status,totalGross,totalCnss,totalTax,totalNet')
        .eq('year', year).order('month', { ascending: true }),
      sb.from('Employee').select('department,workLocation,baseSalary,transportAllowance,housingAllowance,positionAllowance').eq('status', 'ACTIVE'),
    ])

    const processedCycles = (cycles ?? []).filter((c: any) => c.status !== 'DRAFT')
    const totalGross = processedCycles.reduce((a: number, c: any) => a + c.totalGross, 0)
    const totalNet = processedCycles.reduce((a: number, c: any) => a + c.totalNet, 0)
    const totalCnss = processedCycles.reduce((a: number, c: any) => a + c.totalCnss, 0)
    const totalTax = processedCycles.reduce((a: number, c: any) => a + c.totalTax, 0)

    // Employer cost = gross + employer CNSS (usually 13.5% in TG)
    const totalEmployerCost = Math.round(totalGross * 1.135 * 100) / 100

    // Monthly evolution
    const monthlyGross = Array(12).fill(0)
    const monthlyNet = Array(12).fill(0)
    const monthlyEmployerCost = Array(12).fill(0)
    for (const c of processedCycles) {
      const idx = (c.month as number) - 1
      monthlyGross[idx] = c.totalGross
      monthlyNet[idx] = c.totalNet
      monthlyEmployerCost[idx] = Math.round(c.totalGross * 1.135)
    }

    // Overtime & bonuses per month (from employee totals — transport+housing+position)
    const monthlyOvertime = Array(12).fill(0)
    const monthlyBonus = Array(12).fill(0)
    for (const c of processedCycles) {
      const idx = (c.month as number) - 1
      // Estimate: bonuses = total allowances from all employees (approximation from cycle gross - base salaries)
      const empBonusTotal = (employees ?? []).reduce((a: number, e: any) =>
        a + (e.transportAllowance || 0) + (e.housingAllowance || 0) + (e.positionAllowance || 0), 0)
      monthlyBonus[idx] = empBonusTotal
    }

    // By department
    const deptPayMap: Record<string, number> = {}
    for (const e of employees ?? []) {
      const d = e.department || 'Non défini'
      const gross = (e.baseSalary || 0) + (e.transportAllowance || 0) + (e.housingAllowance || 0) + (e.positionAllowance || 0)
      deptPayMap[d] = (deptPayMap[d] || 0) + gross
    }

    // By agency/location
    const agencyPayMap: Record<string, number> = {}
    for (const e of employees ?? []) {
      const loc = e.workLocation || 'Principal'
      const gross = (e.baseSalary || 0) + (e.transportAllowance || 0) + (e.housingAllowance || 0) + (e.positionAllowance || 0)
      agencyPayMap[loc] = (agencyPayMap[loc] || 0) + gross
    }

    const totalOvertimeCost = monthlyOvertime.reduce((a, b) => a + b, 0)
    const totalBonusCost = (employees ?? []).reduce((a: number, e: any) =>
      a + (e.transportAllowance || 0) + (e.housingAllowance || 0) + (e.positionAllowance || 0), 0)

    return NextResponse.json({
      totalGross, totalNet, totalCnss, totalTax, totalEmployerCost,
      paidCycles: processedCycles.length,
      monthlyGross, monthlyNet, monthlyEmployerCost, monthlyOvertime, monthlyBonus,
      deptPayMap, agencyPayMap, totalOvertimeCost, totalBonusCost,
    })
  }

  // ── CONGÉS & PRÉSENCE ──────────────────────────────────────────────────────
  if (type === 'conges') {
    const [{ data: leaves }] = await Promise.all([
      sb.from('Leave').select('type,status,startDate,endDate,employeeId')
        .gte('startDate', yearStart).lte('startDate', yearEnd),
    ])
    const attendances: any[] = []

    // Leave KPIs
    const approved = (leaves ?? []).filter((l: any) => l.status === 'APPROVED')
    const rejected = (leaves ?? []).filter((l: any) => l.status === 'REJECTED')
    const pending = (leaves ?? []).filter((l: any) => l.status === 'PENDING')
    const total = (leaves ?? []).length

    const approvalRate = total > 0 ? Math.round((approved.length / total) * 100) : 0
    const refusalRate = total > 0 ? Math.round((rejected.length / total) * 100) : 0

    // Monthly leaves taken
    const monthlyLeaves = Array(12).fill(0)
    for (const l of approved) {
      if (!l.startDate) continue
      const m = new Date(l.startDate).getMonth()
      const days = l.endDate
        ? Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1
        : 1
      monthlyLeaves[m] += days
    }

    // By type
    const leaveTypeMap: Record<string, number> = {}
    for (const l of approved) {
      const t = l.type || 'Autre'
      leaveTypeMap[t] = (leaveTypeMap[t] || 0) + 1
    }

    // Sick vs others
    const sickDays = approved.filter((l: any) => l.type?.toLowerCase().includes('maladie'))
      .reduce((acc: number, l: any) => {
        const d = l.endDate ? Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1 : 1
        return acc + d
      }, 0)
    const otherDays = approved.reduce((acc: number, l: any) => {
      if (l.type?.toLowerCase().includes('maladie')) return acc
      const d = l.endDate ? Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1 : 1
      return acc + d
    }, 0)
    const totalDays = sickDays + otherDays
    const avgPerEmp = approved.length > 0 ? Math.round(totalDays / new Set(approved.map((l: any) => l.employeeId)).size) : 0

    // Attendance / absences
    const absences = (attendances ?? []).filter((a: any) => a.absence).length
    const workingDays = (attendances ?? []).length
    const absenceRate = workingDays > 0 ? Math.round((absences / workingDays) * 100) : 0

    // Monthly overtime
    const monthlyOvertime = Array(12).fill(0)
    for (const a of attendances ?? []) {
      if (!a.date || !a.overtime) continue
      monthlyOvertime[new Date(a.date).getMonth()] += a.overtime
    }
    const totalOvertime = monthlyOvertime.reduce((a, b) => a + b, 0)
    const avgOvertimePerEmp = 0

    return NextResponse.json({
      approvalRate, refusalRate, pendingCount: pending.length, absenceRate,
      monthlyLeaves, leaveTypeMap, sickDays, otherDays, totalDays, avgPerEmp,
      monthlyOvertime, totalOvertime, avgOvertimePerEmp,
    })
  }

  return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
}
