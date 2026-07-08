'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Topbar({ user }: { user: User }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [photoPath, setPhotoPath] = useState<string | null>(null)

  const displayName = user.user_metadata?.displayName || user.user_metadata?.username || user.email?.replace('@hyconnect.local', '') || 'Utilisateur'
  const userRole = user.user_metadata?.role === 'ADMIN' ? 'Administrateur RH' : (user.user_metadata?.role || 'Utilisateur')
  const department = user.user_metadata?.department || ''

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.photoPath) setPhotoPath(d.photoPath)
    }).catch(() => {})
  }, [])

  const today = new Date()
  const dateStr = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })


  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
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
                <Link href="/employees/new" onClick={() => setQuickOpen(false)} className="w-full flex items-center gap-3 px-4 py-2 text-body-lg text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>person_add</span> Nouvel employé
                </Link>
                <Link href="/contracts" onClick={() => setQuickOpen(false)} className="w-full flex items-center gap-3 px-4 py-2 text-body-lg text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>description</span> Nouveau contrat
                </Link>
                <Link href="/documents" onClick={() => setQuickOpen(false)} className="w-full flex items-center gap-3 px-4 py-2 text-body-lg text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>upload_file</span> Nouveau document
                </Link>
                <Link href="/leaves" onClick={() => setQuickOpen(false)} className="w-full flex items-center gap-3 px-4 py-2 text-body-lg text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>event_busy</span> Demande de congé
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Notifications */}
        <button className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant relative">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>notifications</span>
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-error text-on-error text-caption rounded-full flex items-center justify-center leading-none">3</span>
        </button>

        {/* Aide */}
        <button className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>help</span>
        </button>

        {/* Menu utilisateur */}
        <div className="relative ml-2">
          <button
            onClick={() => { setMenuOpen(m => !m); setQuickOpen(false) }}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-surface-container-low transition-colors"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant flex-shrink-0">
              {photoPath
                ? <img src={photoPath} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-primary-container text-primary font-bold flex items-center justify-center text-title-sm">{displayName.charAt(0).toUpperCase()}</div>
              }
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-body-lg text-on-surface font-medium leading-tight">{displayName}</div>
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
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant flex-shrink-0">
                    {photoPath
                      ? <img src={photoPath} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-primary-container text-primary font-bold flex items-center justify-center text-title-md">{displayName.charAt(0).toUpperCase()}</div>
                    }
                  </div>
                  <div>
                    <div className="text-body-lg font-medium text-on-surface">{displayName}</div>
                    <div className="text-caption text-secondary">{userRole}</div>
                    {department && <div className="text-caption text-secondary">{department}</div>}
                  </div>
                </div>

                <Link href="/settings?tab=profile" onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-body-lg text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person</span>
                  Mon profil
                </Link>
                <Link href="/settings?tab=profile" onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-body-lg text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                  Modifier mon profil
                </Link>
                <Link href="/settings" onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-body-lg text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>settings</span>
                  Paramètres
                </Link>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-body-lg text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>notifications</span>
                  Notifications
                </button>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-body-lg text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>dark_mode</span>
                  Mode sombre
                </button>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-body-lg text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>translate</span>
                  Langue
                </button>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-body-lg text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>help</span>
                  Aide
                </button>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-body-lg text-on-surface hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>info</span>
                  À propos
                </button>

                <div className="border-t border-outline-variant mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-body-lg text-error hover:bg-error-container hover:text-on-error-container transition-colors"
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
