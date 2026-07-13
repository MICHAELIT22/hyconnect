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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0f172a]">

      {/* Orbes animés */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] animate-[drift1_12s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] rounded-full bg-indigo-500/20 blur-[120px] animate-[drift2_15s_ease-in-out_infinite]" />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-sky-400/10 blur-[100px] animate-[drift3_18s_ease-in-out_infinite]" />
      </div>

      {/* Grille subtile */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '48px 48px' }}
      />

      <style>{`
        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 40px) scale(0.97); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-50px, 30px) scale(1.08); }
          66% { transform: translate(30px, -40px) scale(0.95); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-60px, -50px) scale(1.1); }
        }
      `}</style>
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
