import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import '@/lib/chartSetup'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={user} />
        <main className="flex-1 overflow-auto p-3 bg-background">
          {children}
        </main>
        <footer className="h-7 bg-surface border-t border-outline-variant flex items-center justify-between px-3 flex-shrink-0">
          <span className="text-caption text-secondary">HyConnect HRMS v2.0.0</span>
          <span className="text-caption text-secondary">© 2026 Hyundai CO-TO AUTO</span>
        </footer>
      </div>
    </div>
  )
}
