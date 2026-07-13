import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString()
  const nowIso = now.toISOString()

  try {
    // Batch 1: employee counts
    const [
      { count: totalEmployees },
      { count: activeEmployees },
      { count: departedEmployees },
      { count: newHiresThisMonth },
    ] = await Promise.all([
      sb.from('Employee').select('id', { count: 'exact', head: true }),
      sb.from('Employee').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      sb.from('Employee').select('id', { count: 'exact', head: true }).neq('status', 'ACTIVE'),
      sb.from('Employee').select('id', { count: 'exact', head: true }).gte('hireDate', startOfMonth).eq('status', 'ACTIVE'),
    ])

    // Batch 2: attendance + leaves
    const [
      { count: absentToday },
      { count: presentToday },
      { count: leavesInProgress },
      { count: leavesPending },
      { count: leavesApproved },
    ] = await Promise.all([
      sb.from('Attendance').select('id', { count: 'exact', head: true }).gte('date', today).lt('date', tomorrow).eq('absence', true),
      sb.from('Attendance').select('id', { count: 'exact', head: true }).gte('date', today).lt('date', tomorrow).eq('absence', false),
      sb.from('Leave').select('id', { count: 'exact', head: true }).eq('status', 'APPROVED').lte('startDate', nowIso).gte('endDate', nowIso),
      sb.from('Leave').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
      sb.from('Leave').select('id', { count: 'exact', head: true }).eq('status', 'APPROVED').gte('startDate', startOfMonth),
    ])

    // Batch 3: trainings + contract alerts
    const [
      { count: trainingsThisYear },
      { count: trainingsUpcoming },
      { data: trialEmployees },
      { data: expiringContractsRaw },
    ] = await Promise.all([
      sb.from('Training').select('id', { count: 'exact', head: true }).gte('date', startOfYear).lte('date', nowIso),
      sb.from('Training').select('id', { count: 'exact', head: true }).gt('date', nowIso),
      sb.from('Contract').select('trialEndDate, Employee(firstName, lastName)').eq('status', 'ACTIVE').gte('trialEndDate', nowIso).lte('trialEndDate', thirtyDaysLater).limit(5),
      sb.from('Contract').select('endDate, Employee(firstName, lastName)').eq('status', 'ACTIVE').gte('endDate', nowIso).lte('endDate', thirtyDaysLater).order('endDate').limit(5),
    ])

    // Batch 4: employees for buckets + recent hires
    const [{ data: allActiveEmps }, { data: recentHires }] = await Promise.all([
      sb.from('Employee').select('hireDate, birthDate, department, sex').eq('status', 'ACTIVE'),
      sb.from('Employee').select('firstName, lastName, position, hireDate, department').gte('hireDate', startOfMonth).order('hireDate', { ascending: false }).limit(5),
    ])

    // Batch 5: recent activity + todo
    const [
      { data: recentContracts },
      { data: recentEmps },
      { data: activeEmpsForContract },
      { data: empContractIds },
      { count: empMissingInfo },
      { data: companySettings },
      { data: birthdayEmps },
    ] = await Promise.all([
      sb.from('Contract').select('contractNo, createdAt, Employee(firstName, lastName)').order('createdAt', { ascending: false }).limit(3),
      sb.from('Employee').select('firstName, lastName, createdAt').order('createdAt', { ascending: false }).limit(3),
      sb.from('Employee').select('id').eq('status', 'ACTIVE'),
      sb.from('Contract').select('employeeId').eq('status', 'ACTIVE'),
      sb.from('Employee').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE').or('nationalId.is.null,nationalId.eq.,socialSecurityNumber.is.null,socialSecurityNumber.eq.,accountNumber.is.null,accountNumber.eq.'),
      sb.from('Setting').select('key, value').in('key', ['company_name', 'company_address', 'company_phone', 'company_nif']),
      sb.from('Employee').select('firstName, lastName, birthDate').eq('status', 'ACTIVE'),
    ])

    const empIdsWithContract = new Set((empContractIds ?? []).map((c: any) => c.employeeId))
    const empNoContract = (activeEmpsForContract ?? []).filter((e: any) => !empIdsWithContract.has(e.id)).length

    // Headcount evolution (6 months) — 6 sequential queries
    const headcountEvolution: number[] = []
    for (let i = 5; i >= 0; i--) {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).toISOString()
      const { count } = await sb.from('Employee').select('id', { count: 'exact', head: true }).lte('hireDate', monthEnd)
      headcountEvolution.push(count || 0)
    }

    // JS grouping
    const deptMap: Record<string, number> = {}
    const genderMap: Record<string, number> = {}
    const seniorityBuckets: Record<string, number> = { '<1an': 0, '1-5ans': 0, '5-10ans': 0, '+10ans': 0 }
    const ageBuckets: Record<string, number> = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '+55': 0 };

    (allActiveEmps || []).forEach((e: any) => {
      if (e.department) deptMap[e.department] = (deptMap[e.department] || 0) + 1
      if (e.sex) genderMap[e.sex] = (genderMap[e.sex] || 0) + 1
      const yrs = (now.getTime() - new Date(e.hireDate).getTime()) / (365.25 * 24 * 3600 * 1000)
      if (yrs < 1) seniorityBuckets['<1an']++
      else if (yrs < 5) seniorityBuckets['1-5ans']++
      else if (yrs < 10) seniorityBuckets['5-10ans']++
      else seniorityBuckets['+10ans']++
      if (e.birthDate) {
        const age = (now.getTime() - new Date(e.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000)
        if (age <= 25) ageBuckets['18-25']++
        else if (age <= 35) ageBuckets['26-35']++
        else if (age <= 45) ageBuckets['36-45']++
        else if (age <= 55) ageBuckets['46-55']++
        else ageBuckets['+55']++
      }
    })

    const birthdaysThisMonth = (birthdayEmps || []).filter((e: any) =>
      e.birthDate && new Date(e.birthDate).getMonth() === now.getMonth()
    )

    const byDepartment = Object.entries(deptMap).map(([department, count]) => ({ department, _count: { id: count } }))
    const genderDistribution = Object.entries(genderMap).map(([sex, count]) => ({ sex, _count: { id: count } }))
    const absenteeismRate = (activeEmployees || 0) > 0 ? Math.round(((absentToday || 0) / (activeEmployees || 1)) * 100) : 0

    const recentActivity = [
      ...(recentContracts || []).map((c: any) => ({
        type: 'Contrat modifié',
        message: `${c.Employee?.firstName} ${c.Employee?.lastName} (${c.contractNo})`,
        date: c.createdAt,
      })),
      ...(recentEmps || []).map((e: any) => ({
        type: 'Nouvel employé',
        message: `${e.firstName} ${e.lastName}`,
        date: e.createdAt,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)

    const settingsMap = Object.fromEntries((companySettings || []).map((s: any) => [s.key, s.value]))
    const missingFields: string[] = []
    if (!settingsMap.company_address) missingFields.push('Adresse')
    if (!settingsMap.company_phone) missingFields.push('Téléphone')
    if (!settingsMap.company_nif) missingFields.push('NIF')

    const todoItems: any[] = []
    if (missingFields.length > 0) todoItems.push({ type: 'company_profile', label: 'Complétez le profil de votre entreprise', detail: missingFields.join(', '), severity: 'warning', href: '/settings' })
    if ((empNoContract || 0) > 0) todoItems.push({ type: 'missing_contract', label: `${empNoContract} employé${(empNoContract || 0) > 1 ? 's' : ''} sans contrat`, detail: 'Risque de conformité — ajoutez des contrats', severity: 'error', href: '/contracts' })
    if ((empMissingInfo || 0) > 0) todoItems.push({ type: 'missing_info', label: `${empMissingInfo} employé${(empMissingInfo || 0) > 1 ? 's' : ''} avec des infos manquantes`, detail: 'NIF, CNSS ou coordonnées bancaires manquants', severity: 'warning', href: '/employees' })

    return NextResponse.json({
      kpi: {
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeEmployees || 0,
        departedEmployees: departedEmployees || 0,
        newHiresThisMonth: newHiresThisMonth || 0,
        presentToday: presentToday || 0,
        absentToday: absentToday || 0,
        absenteeismRate,
      },
      byDepartment,
      trialEmployees: (trialEmployees || []).map((t: any) => ({ employee: t.Employee, trialEndDate: t.trialEndDate })),
      expiringContracts: (expiringContractsRaw || []).map((c: any) => ({ employee: c.Employee, endDate: c.endDate })),
      birthdaysThisMonth,
      recentHires: recentHires || [],
      seniorityBuckets,
      ageBuckets,
      leavesInProgress: leavesInProgress || 0,
      leavesPending: leavesPending || 0,
      leavesApproved: leavesApproved || 0,
      trainingsThisYear: trainingsThisYear || 0,
      trainingsUpcoming: trainingsUpcoming || 0,
      upcomingMedical: [],
      recentActivity,
      headcountEvolution,
      genderDistribution,
      todoItems,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[dashboard]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
