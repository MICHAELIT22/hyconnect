'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    // Ne pas montrer si déjà installé
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Délai de 3s avant d'afficher le modal
      setTimeout(() => setShow(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    setInstalling(true)
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
      setTimeout(() => setShow(false), 2000)
    } else {
      setInstalling(false)
    }
    setDeferredPrompt(null)
  }

  if (!show) return null

  const features = [
    { icon: 'offline_bolt', label: 'Accès rapide', desc: 'Lance-toi en un clic depuis le bureau' },
    { icon: 'notifications', label: 'Notifications', desc: 'Alertes congés et contrats' },
    { icon: 'fullscreen', label: 'Plein écran', desc: 'Interface sans barre de navigation' },
  ]

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>

      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>

        {/* Header dégradé */}
        <div className="relative px-5 pt-6 pb-4 overflow-hidden">
          <div className="absolute inset-0 opacity-20"
            style={{ background: 'radial-gradient(ellipse at top left, #3b82f6, transparent 60%)' }} />

          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg"
              style={{ boxShadow: '0 0 0 2px rgba(255,255,255,0.15), 0 8px 24px rgba(26,86,219,0.4)' }}>
              {imgError
                ? <div className="w-full h-full bg-[#1A56DB] flex items-center justify-center text-white font-bold text-lg">HC</div>
                : <Image src="/icon-192.png" alt="HyConnect" width={56} height={56} className="w-full h-full object-cover" onError={() => setImgError(true)} />
              }
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400 mb-0.5">Installer l'application</p>
              <h2 className="text-lg font-bold text-white leading-tight">HyConnect RH</h2>
              <p className="text-xs text-white/50 mt-0.5">Gestion des ressources humaines</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="px-5 py-3 space-y-2.5">
          {features.map(f => (
            <div key={f.icon} className="flex items-center gap-3 p-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[16px] text-blue-400">{f.icon}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-white/90 leading-tight">{f.label}</p>
                <p className="text-[10px] text-white/40 leading-tight mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-3 flex gap-3">
          <button
            onClick={() => setShow(false)}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50 transition-all hover:text-white/80"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Plus tard
          </button>
          <button
            onClick={handleInstall}
            disabled={installing || installed}
            className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-80"
            style={{ background: installed ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#1A56DB,#3b82f6)', boxShadow: '0 4px 20px rgba(26,86,219,0.4)' }}
          >
            {installed ? (
              <><span className="material-symbols-outlined text-[16px]">check_circle</span> Installé !</>
            ) : installing ? (
              <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Installation...</>
            ) : (
              <><span className="material-symbols-outlined text-[16px]">download</span> Installer</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
