'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur RH',
  RH: 'Responsable RH',
  ASSISTANT: 'Assistant RH',
  STAFF: 'Employé',
}

export default function Topbar({ user }: { user: User }) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [photoPath, setPhotoPath] = useState<string | null>(null)
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [logoError, setLogoError] = useState(false)
  const [displayName, setDisplayName] = useState(
    user.email?.replace('@hyconnect.local', '') || 'Utilisateur'
  )
  const [userRole, setUserRole] = useState('Utilisateur')
  const [department, setDepartment] = useState('')

  const fetchLogo = useCallback(() => {
    fetch('/api/settings?section=company').then(r => r.json()).then(d => {
      setCompanyLogo(d?.company_logo || null)
      setLogoError(false)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    // Charge le profil réel depuis la table User (pas user_metadata Supabase Auth)
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.displayName) setDisplayName(d.displayName)
      if (d.role) setUserRole(ROLE_LABELS[d.role] || d.role)
      if (d.department) setDepartment(d.department)
      if (d.photoPath) setPhotoPath(d.photoPath)
    }).catch(() => {})
    fetchLogo()
  }, [])

  useEffect(() => { fetchLogo() }, [pathname, fetchLogo])

  useEffect(() => {
    window.addEventListener('logo-updated', fetchLogo)
    return () => window.removeEventListener('logo-updated', fetchLogo)
  }, [fetchLogo])

  const today = new Date()
  const dateStr = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const Avatar = ({ size }: { size: 'sm' | 'md' }) => {
    const cls = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
    return (
      <div className={`${cls} rounded-full overflow-hidden border border-outline-variant flex-shrink-0 bg-white`}>
        {photoPath
          ? <img src={photoPath} alt="" className="w-full h-full object-cover" />
          : companyLogo && !logoError
            ? <img src={companyLogo} alt="logo" className="w-full h-full object-contain p-0.5" onError={() => setLogoError(true)} />
            : <div className="w-full h-full bg-primary-container text-primary font-bold flex items-center justify-center text-title-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
        }
      </div>
    )
  }

  return (
    <header className="h-11 bg-surface border-b border-outline-variant flex items-center justify-between px-3 flex-shrink-0 relative z-50">
      <div className="flex items-center gap-4 min-w-0">
        <div className="hidden sm:block">
          <span className="text-body-md text-on-surface font-medium">Bonjour, {displayName}</span>
          <span className="text-caption text-secondary ml-2">{dateStr}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Bouton Nouveau */}
        <div className="relative">
          <button
            onClick={() => { setQuickOpen(q => !q); setMenuOpen(false) }}
            className="bg-primary text-on-primary text-label-md px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-primary-fixed-variant transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
            Nouveau
          </button>
          {quickOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setQuickOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-surface rounded-xl shadow-level-1 border border-outline-variant py-1 z-50">
                <Link href="/employees/new" onClick={() => setQuickOpen(false)} className="w-full flex items-center gap-3 px-4 py-2 text-body-md text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>person_add</span> Nouvel employé
                </Link>
                <Link href="/contracts" onClick={() => setQuickOpen(false)} className="w-full flex items-center gap-3 px-4 py-2 text-body-md text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>description</span> Nouveau contrat
                </Link>
                <Link href="/documents" onClick={() => setQuickOpen(false)} className="w-full flex items-center gap-3 px-4 py-2 text-body-md text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>upload_file</span> Nouveau document
                </Link>
                <Link href="/leaves" onClick={() => setQuickOpen(false)} className="w-full flex items-center gap-3 px-4 py-2 text-body-md text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>event_busy</span> Demande de congé
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Notifications — icône seule, badge retiré (pas de données réelles) */}
        <button className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>notifications</span>
        </button>

        {/* Aide → lien vers paramètres */}
        <Link href="/settings" className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>help</span>
        </Link>

        {/* Menu utilisateur */}
        <div className="relative ml-2">
          <button
            onClick={() => { setMenuOpen(m => !m); setQuickOpen(false) }}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-surface-container-low transition-colors"
          >
            <Avatar size="sm" />
            <div className="hidden sm:block text-left">
              <div className="text-body-md text-on-surface font-medium leading-tight">{displayName}</div>
              <div className="text-caption text-secondary">{userRole}{department ? ` · ${department}` : ''}</div>
            </div>
            <span className="material-symbols-outlined text-secondary" style={{ fontSize: '16px' }}>
              {menuOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-64 bg-surface rounded-xl shadow-level-1 border border-outline-variant py-1 z-50">
                {/* Header identité */}
                <div className="px-4 py-3 border-b border-outline-variant flex items-center gap-3">
                  <Avatar size="md" />
                  <div>
                    <div className="text-body-md font-semibold text-on-surface">{displayName}</div>
                    <div className="text-caption text-secondary">{userRole}</div>
                    {department && <div className="text-caption text-secondary">{department}</div>}
                  </div>
                </div>

                <Link href="/settings?section=company" onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-body-md text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>business</span>
                  Paramètres entreprise
                </Link>
                <Link href="/settings?section=users" onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-body-md text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>manage_accounts</span>
                  Gérer les utilisateurs
                </Link>
                <Link href="/employees" onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-body-md text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group</span>
                  Employés
                </Link>
                <Link href="/payroll" onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-body-md text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>payments</span>
                  Paie
                </Link>

                <div className="border-t border-outline-variant mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-body-md text-error hover:bg-error-container hover:text-on-error-container transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
                    Déconnexion
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
