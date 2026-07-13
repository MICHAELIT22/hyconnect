'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function LoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imgError, setImgError] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const email = username.includes('@') ? username : `${username}@hyconnect.local`

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Identifiants invalides. Veuillez réessayer.')
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  const floatingCards = [
    { icon: 'person_add', label: 'Nouvel employé', value: '+1 aujourd\'hui', color: '#1A56DB', delay: '0s', x: '6%', y: '12%' },
    { icon: 'payments', label: 'Paie du mois', value: 'En cours', color: '#0D9488', delay: '1.5s', x: '72%', y: '8%' },
    { icon: 'event_busy', label: 'Congés en attente', value: '3 demandes', color: '#F59E0B', delay: '3s', x: '78%', y: '62%' },
    { icon: 'description', label: 'Contrats actifs', value: '24 contrats', color: '#7C3AED', delay: '0.8s', x: '4%', y: '68%' },
    { icon: 'school', label: 'Formation', value: 'Planifiée', color: '#0D9488', delay: '2.2s', x: '60%', y: '80%' },
    { icon: 'groups', label: 'Effectif total', value: '48 employés', color: '#1A56DB', delay: '4s', x: '20%', y: '78%' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>

      <style>{`
        @keyframes floatCard {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.85; }
          50% { transform: translateY(-14px) rotate(1deg); opacity: 1; }
        }
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>

      {/* Grille de fond */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize: '60px 60px' }}
      />

      {/* Ligne de scan animée */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-0 right-0 h-[2px] opacity-[0.04]"
          style={{ background: 'linear-gradient(90deg,transparent,#60a5fa,transparent)', animation: 'scanline 8s linear infinite' }}
        />
      </div>

      {/* Cartes flottantes RH */}
      {floatingCards.map((card, i) => (
        <div
          key={i}
          className="absolute pointer-events-none hidden lg:flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border backdrop-blur-sm"
          style={{
            left: card.x, top: card.y,
            background: 'rgba(255,255,255,0.05)',
            borderColor: 'rgba(255,255,255,0.1)',
            boxShadow: `0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)`,
            animation: `floatCard ${6 + i * 0.7}s ease-in-out infinite`,
            animationDelay: card.delay,
          }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${card.color}22` }}>
            <span className="material-symbols-outlined text-[16px]" style={{ color: card.color }}>{card.icon}</span>
          </div>
          <div>
            <p className="text-[10px] text-white/50 leading-none mb-0.5">{card.label}</p>
            <p className="text-[12px] font-semibold text-white/90 leading-none">{card.value}</p>
          </div>
          <div className="w-1.5 h-1.5 rounded-full ml-1 flex-shrink-0" style={{ backgroundColor: card.color, animation: `pulse-dot 2s ease-in-out infinite`, animationDelay: card.delay }} />
        </div>
      ))}

      {/* Lueur centrale douce */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
      </div>
      <div className="bg-surface rounded-xl shadow-level-1 border border-outline-variant w-full max-w-md p-6">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-primary rounded-xl flex items-center justify-center text-on-primary mb-4 overflow-hidden">
            {imgError ? (
              <span className="text-headline-md font-bold">HC</span>
            ) : (
              <Image
                src="/logo.png"
                alt="HyConnect Logo"
                width={64}
                height={64}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
                priority
              />
            )}
          </div>
          <h1 className="text-headline-md text-primary font-bold">HyConnect</h1>
          <p className="text-caption text-secondary mt-1">Human Resources Management System</p>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container p-3 rounded-lg text-body-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-label-md text-on-surface-variant block mb-1">Nom d&apos;utilisateur</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: '18px' }}>person</span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Votre identifiant"
                required
                autoFocus
                className="w-full pl-10 pr-3 py-2.5 bg-surface-container border border-outline-variant rounded-lg text-body-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder-on-surface-variant"
              />
            </div>
          </div>

          <div>
            <label className="text-label-md text-on-surface-variant block mb-1">Mot de passe</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: '18px' }}>lock</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                required
                className="w-full pl-10 pr-10 py-2.5 bg-surface-container border border-outline-variant rounded-lg text-body-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder-on-surface-variant"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-body-lg text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
              />
              Se souvenir de moi
            </label>
            <button type="button" className="text-label-md text-primary hover:underline">
              Mot de passe oublié ?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary py-2.5 rounded-lg text-title-sm font-semibold hover:bg-primary-fixed-variant transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Connexion...
              </>
            ) : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-caption text-secondary mt-6">
          Version 1.0.0 · © 2026 Hyundai CO-TO AUTO
        </p>
      </div>
    </div>
  )
}
