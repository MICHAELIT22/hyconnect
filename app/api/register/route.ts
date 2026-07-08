import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()

  const { data: employees, error } = await sb
    .from('Employee')
    .select('id,matricule,lastName,firstName,sex,nationality,birthDate,hireDate,position,department,service,status')
    .order('department', { ascending: true })
    .order('lastName', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const empIds = (employees ?? []).map((e: { id: number }) => e.id)

  // Fetch active contracts for all employees
  let contractMap: Record<number, { type: string; endDate: string | null }> = {}
  if (empIds.length > 0) {
    const { data: contracts } = await sb
      .from('Contract')
      .select('employeeId,type,endDate')
      .in('employeeId', empIds)
      .eq('status', 'ACTIVE')
      .order('createdAt', { ascending: false })

    for (const c of contracts ?? []) {
      if (!contractMap[c.employeeId]) {
        contractMap[c.employeeId] = { type: c.type, endDate: c.endDate }
      }
    }
  }

  const register = (employees ?? []).map((emp: {
    id: number; matricule: string; lastName: string; firstName: string; sex: string
    nationality: string; birthDate: string; hireDate: string; position: string
    department: string; service: string; status: string
  }) => ({
    id: emp.id,
    matricule: emp.matricule,
    lastName: emp.lastName,
    firstName: emp.firstName,
    sex: emp.sex,
    nationality: emp.nationality,
    birthDate: emp.birthDate,
    hireDate: emp.hireDate,
    position: emp.position,
    department: emp.department,
    service: emp.service,
    status: emp.status,
    contractType: contractMap[emp.id]?.type || 'N/A',
    contractEndDate: contractMap[emp.id]?.endDate || null,
  }))

  return NextResponse.json(register)
}
