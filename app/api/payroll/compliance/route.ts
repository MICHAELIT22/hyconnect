import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  // Fetch all active employees
  const { data: employees } = await sb
    .from('Employee')
    .select('id,firstName,lastName,matricule,bankName,accountNumber,socialSecurityNumber,taxId,nationalId')
    .eq('status', 'ACTIVE')

  const empIds = (employees ?? []).map((e: any) => e.id)

  // Fetch contracts, payroll cycles, settings in parallel
  const [{ data: activeContracts }, { data: expiredContracts }, { data: cycles }, { data: settings }] = await Promise.all([
    sb.from('Contract').select('employeeId,status').eq('status', 'ACTIVE').in('employeeId', empIds.length ? empIds : [0]),
    sb.from('Contract').select('employeeId,endDate').eq('status', 'ACTIVE').lte('endDate', now.toISOString()).not('endDate', 'is', null).in('employeeId', empIds.length ? empIds : [0]),
    sb.from('PayrollCycle').select('id,month,year,status').gte('createdAt', prevMonthStart).order('year', { ascending: false }).order('month', { ascending: false }).limit(10),
    sb.from('Setting').select('key,value').in('key', ['company_nif', 'company_social_security']),
  ])

  const settingsMap = Object.fromEntries((settings ?? []).map((s: any) => [s.key, s.value]))
  const activeContractEmpIds = new Set((activeContracts ?? []).map((c: any) => c.employeeId))
  const expiredContractEmpIds = new Set((expiredContracts ?? []).map((c: any) => c.employeeId))

  // CHECK 1: Active contracts — employees without active contract
  const noContractEmps = (employees ?? []).filter((e: any) => !activeContractEmpIds.has(e.id))

  // CHECK 2: Company registration — NIF + CNSS in settings
  const missingCompanyFields: string[] = []
  if (!settingsMap.company_nif) missingCompanyFields.push('NIF')
  if (!settingsMap.company_social_security) missingCompanyFields.push('N° Sécurité sociale')

  // CHECK 3: Bank coordinates
  const noBankEmps = (employees ?? []).filter((e: any) => !e.bankName || !e.accountNumber)

  // CHECK 4: Tax ID (NIF)
  const noTaxIdEmps = (employees ?? []).filter((e: any) => !e.taxId && !e.nationalId)

  // CHECK 5: Social security number
  const noSsnEmps = (employees ?? []).filter((e: any) => !e.socialSecurityNumber)

  // CHECK 6: Payroll up to date (current or previous month processed)
  const recentProcessed = (cycles ?? []).some((c: any) =>
    c.status !== 'DRAFT' &&
    ((c.year === now.getFullYear() && c.month === now.getMonth() + 1) ||
     (c.year === now.getFullYear() && c.month === now.getMonth()) ||
     (now.getMonth() === 0 && c.year === now.getFullYear() - 1 && c.month === 12))
  )

  // CHECK 7: Expired contracts
  const expiredCount = expiredContractEmpIds.size

  const checks = [
    {
      id: 'active_contracts',
      title: 'Contrats Actifs',
      description: 'Tous les employés actifs doivent avoir un contrat de travail actif',
      category: 'Contrats',
      status: noContractEmps.length === 0 ? 'OK' : 'ERROR',
      affected: noContractEmps.length,
      affectedEmployees: noContractEmps.map((e: any) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, matricule: e.matricule })),
      actionLabel: 'Ajouter un contrat',
      actionHref: '/contracts/new',
    },
    {
      id: 'company_registration',
      title: "Enregistrement de l'Entreprise",
      description: "L'entreprise doit avoir un NIF et un enregistrement de sécurité sociale",
      category: 'Entreprise',
      status: missingCompanyFields.length === 0 ? 'OK' : 'ERROR',
      affected: null,
      affectedEmployees: [],
      actionLabel: 'Ouvrir les paramètres',
      actionHref: '/settings',
    },
    {
      id: 'bank_coordinates',
      title: 'Coordonnées Bancaires',
      description: 'Tous les employés doivent avoir des coordonnées bancaires pour le versement du salaire',
      category: 'Employés',
      status: noBankEmps.length === 0 ? 'OK' : 'WARNING',
      affected: noBankEmps.length,
      affectedEmployees: noBankEmps.map((e: any) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, matricule: e.matricule })),
      actionLabel: null,
      actionHref: null,
    },
    {
      id: 'tax_id',
      title: 'Identification Fiscale',
      description: 'Tous les employés doivent avoir un numéro d\'identification fiscale (NIF) enregistré',
      category: 'Employés',
      status: noTaxIdEmps.length === 0 ? 'OK' : 'WARNING',
      affected: noTaxIdEmps.length,
      affectedEmployees: noTaxIdEmps.map((e: any) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, matricule: e.matricule })),
      actionLabel: null,
      actionHref: null,
    },
    {
      id: 'social_security',
      title: 'Inscription Sécurité Sociale',
      description: 'Tous les employés doivent avoir un numéro de sécurité sociale enregistré',
      category: 'Employés',
      status: noSsnEmps.length === 0 ? 'OK' : 'WARNING',
      affected: noSsnEmps.length,
      affectedEmployees: noSsnEmps.map((e: any) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, matricule: e.matricule })),
      actionLabel: null,
      actionHref: null,
    },
    {
      id: 'payroll_current',
      title: 'Paie à Jour',
      description: 'La paie doit être traitée pour le mois en cours ou précédent',
      category: 'Paie',
      status: recentProcessed ? 'OK' : 'WARNING',
      affected: 0,
      affectedEmployees: [],
      actionLabel: 'Lancer la paie',
      actionHref: '/payroll',
    },
    {
      id: 'expired_contracts',
      title: 'Expiration des Contrats',
      description: 'Aucun contrat actif ne devrait être expiré',
      category: 'Contrats',
      status: expiredCount === 0 ? 'OK' : 'WARNING',
      affected: expiredCount,
      affectedEmployees: [],
      actionLabel: null,
      actionHref: null,
    },
  ]

  const errors = checks.filter(c => c.status === 'ERROR').length
  const warnings = checks.filter(c => c.status === 'WARNING').length
  const ok = checks.filter(c => c.status === 'OK').length
  const score = Math.round((ok / checks.length) * 100)

  return NextResponse.json({ checks, score, errors, warnings, ok })
}
