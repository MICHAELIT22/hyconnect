'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'

const navGroups = [
  {
    label: 'Gestion RH',
    items: [
      { href: '/dashboard', icon: 'dashboard', label: 'Tableau de bord' },
      { href: '/employees', icon: 'group', label: 'Employés' },
      { href: '/contracts', icon: 'description', label: 'Contrats' },
      { href: '/documents', icon: 'folder_shared', label: 'Documents' },
      { href: '/payroll', icon: 'payments', label: 'Paie' },
    ],
  },
  {
    label: 'Temps & Présence',
    items: [
      { href: '/leaves', icon: 'event_busy', label: 'Congés & Absences' },
      { href: '/attendance', icon: 'fingerprint', label: 'Présence' },
      { href: '/medical', icon: 'medical_services', label: 'Visites médicales' },
    ],
  },
  {
    label: 'Développement',
    items: [
      { href: '/trainings', icon: 'school', label: 'Formations' },
    ],
  },
  {
    label: 'Analyse & Admin',
    items: [
      { href: '/reports', icon: 'assessment', label: 'Rapports' },
      { href: '/register', icon: 'assignment_ind', label: 'Registre du personnel' },
      { href: '/settings', icon: 'settings', label: 'Paramètres' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [imgError, setImgError] = useState(false)

  return (
    <aside
      className={`flex flex-col bg-surface-variant border-r border-outline-variant flex-shrink-0 transition-all duration-300 ${
        collapsed ? 'w-20 p-2' : 'w-[280px] p-4'
      }`}
    >
      {/* Logo + Toggle */}
      <div className={`mb-6 mt-2 flex items-center ${collapsed ? 'justify-between w-full' : 'justify-between'}`}>
        {collapsed ? (
          <div className="flex items-center justify-between w-full">
            {imgError ? (
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-on-primary">
                <span className="text-title-sm font-bold">HC</span>
              </div>
            ) : (
              <Image src="/logo.png" alt="HyConnect" width={32} height={32} className="rounded-lg object-cover" onError={() => setImgError(true)} />
            )}
            <button onClick={() => setCollapsed(false)} className="p-1 rounded-lg hover:bg-surface-container-high text-secondary">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chevron_right</span>
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              {imgError ? (
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-on-primary">
                  <span className="text-title-sm font-bold">HC</span>
                </div>
              ) : (
                <Image src="/logo.png" alt="HyConnect" width={32} height={32} className="rounded-lg object-cover" onError={() => setImgError(true)} />
              )}
              <div>
                <h1 className="text-[18px] font-bold text-primary leading-tight">HyConnect</h1>
                <p className="text-caption text-secondary">HR Management System</p>
              </div>
            </div>
            <button onClick={() => setCollapsed(true)} className="p-2 rounded-lg hover:bg-surface-container-high text-secondary">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-4 flex-1 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-label-md text-on-surface-variant uppercase px-2 mb-1 tracking-wider">
                {group.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {navGroups && group.items.map(item => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200
                      ${active
                        ? 'bg-primary-container text-on-primary-container font-semibold'
                        : 'text-secondary hover:text-primary hover:bg-surface-container-highest'
                      }
                      ${collapsed ? 'justify-center' : ''}`}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '20px', fontVariationSettings: active ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 300" }}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && <span className="text-body-lg">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="mt-auto pt-4 border-t border-outline-variant text-caption text-secondary text-center">
          HyConnect v2.0.0
        </div>
      )}
    </aside>
  )
}
