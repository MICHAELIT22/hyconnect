'use client'

import { useRouter } from 'next/navigation'
import EmployeeForm from '@/components/employees/EmployeeForm'

export default function NewEmployeePage() {
  const router = useRouter()
  return (
    <EmployeeForm
      mode="page"
      onClose={() => router.push('/employees')}
      onSuccess={() => router.push('/employees')}
    />
  )
}
