import { Suspense } from 'react'
import DashboardClient from './DashboardClient'

export const metadata = { title: 'Tableau de bord | HyConnect' }

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient />
    </Suspense>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-surface-variant rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="h-64 bg-surface-variant rounded-2xl" />
        <div className="h-64 bg-surface-variant rounded-2xl" />
      </div>
    </div>
  )
}
