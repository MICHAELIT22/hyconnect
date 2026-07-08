'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface PayrollCycle {
  id: number
  month: number
  year: number
  status: 'DRAFT' | 'PROCESSED' | 'PAID'
  totalGross: number
  totalCnss: number
  totalTax: number
  totalNet: number
  createdAt: string
}

const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
const MONTHS_FR_LONG = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

const STATUS_LABELS: Record<string, string> = { DRAFT: 'Brouillon', PROCESSED: 'Traité', PAID: 'Payé' }
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-surface-container text-secondary border border-outline-variant',
  PROCESSED: 'bg-primary/10 text-primary',
  PAID: 'bg-tertiary/10 text-tertiary',
}

export default function PayrollPage() {
  const router = useRouter()
  const [cycles, setCycles] = useState<PayrollCycle[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const now = new Date()
  const [newMonth, setNewMonth] = useState(now.getMonth() + 1)
  const [newYear, setNewYear] = useState(now.getFullYear())

  const load = () => {
    setLoading(true)
    axios.get('/api/payroll/cycles').then(r => setCycles(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Preview: count eligible employees when month/year changes in modal
  useEffect(() => {
    if (!showCreate) return
    setLoadingPreview(true)
    setPreviewCount(null)
    axios.get(`/api/payroll?previewOnly=true`).then(r => {
      setPreviewCount(r.data?.payroll?.length ?? 0)
    }).catch(() => setPreviewCount(0)).finally(() => setLoadingPreview(false))
  }, [showCreate, newMonth, newYear])

  const handleCreate = async () => {
    setCreating(true)
    setCreateError('')
    try {
      const res = await axios.post('/api/payroll/cycles', { month: newMonth, year: newYear })
      setShowCreate(false)
      load()
      router.push(`/payroll/${res.data.id}`)
    } catch (e: any) {
      setCreateError(e.response?.data?.error || 'Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirm === null) return
    await axios.delete(`/api/payroll/cycles/${deleteConfirm}`)
    setDeleteConfirm(null)
    load()
  }

  const filtered = cycles.filter(c => {
    const matchStatus = !filterStatus || c.status === filterStatus
    const label = `${MONTHS_FR[c.month - 1]} ${c.year}`.toLowerCase()
    const matchSearch = !search || label.includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const statusCounts = {
    DRAFT: cycles.filter(c => c.status === 'DRAFT').length,
    PROCESSED: cycles.filter(c => c.status === 'PROCESSED').length,
    PAID: cycles.filter(c => c.status === 'PAID').length,
  }

  const fmt = (n: number) => n.toLocaleString('fr-FR') + ' FCFA'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-md font-semibold text-on-surface">Paie</h1>
          <p className="text-body-md text-on-surface-variant">{cycles.length} cycle{cycles.length !== 1 ? 's' : ''} au total</p>
        </div>
        <button onClick={() => { setShowCreate(true); setCreateError('') }} className="btn-primary">
          <span className="material-symbols-outlined text-[13px]">add</span>
          Nouveau cycle
        </button>
      </div>

      {/* Status filter tabs + search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          {[
            { key: '', label: 'Tous', count: cycles.length },
            { key: 'DRAFT', label: 'Brouillon', count: statusCounts.DRAFT },
            { key: 'PROCESSED', label: 'Traité', count: statusCounts.PROCESSED },
            { key: 'PAID', label: 'Payé', count: statusCounts.PAID },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-md font-medium transition-colors ${
                filterStatus === tab.key
                  ? 'bg-on-surface text-surface'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
            >
              {tab.label}
              <span className={`text-caption px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                filterStatus === tab.key ? 'bg-surface/20' : 'bg-surface-container'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value=""
            className="text-body-md border border-outline-variant rounded-lg px-2 py-1.5 bg-surface text-on-surface-variant"
          >
            <option value="">Tous</option>
          </select>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[14px]">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par période o..."
              className="pl-8 pr-3 py-1.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 w-52"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-surface-variant rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant mb-3">calendar_today</span>
          <p className="text-title-sm font-semibold text-on-surface mb-1">Aucun cycle de paie</p>
          <p className="text-body-md text-on-surface-variant mb-4">Créez votre premier cycle de paie pour commencer</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <span className="material-symbols-outlined text-[13px]">add</span>
            Créer le cycle
          </button>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-lowest">
                <th className="text-left px-4 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase">Période</th>
                <th className="text-left px-4 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase">Statut</th>
                <th className="text-right px-4 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase">Brut</th>
                <th className="text-right px-4 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase">CNSS</th>
                <th className="text-right px-4 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase">Impôts</th>
                <th className="text-right px-4 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase">Net</th>
                <th className="text-right px-4 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.map(cycle => (
                <tr key={cycle.id} className="hover:bg-surface-container-lowest transition-colors group">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/payroll/${cycle.id}`)}
                      className="text-body-md font-semibold text-on-surface hover:text-primary transition-colors capitalize"
                    >
                      {MONTHS_FR[cycle.month - 1]} {cycle.year}
                    </button>
                    <p className="text-caption text-secondary">{new Date(cycle.createdAt).toLocaleDateString('fr-FR')}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-caption px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[cycle.status]}`}>
                      {STATUS_LABELS[cycle.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-body-md text-on-surface font-medium">{fmt(cycle.totalGross)}</td>
                  <td className="px-4 py-3 text-right text-body-md text-warning">{fmt(cycle.totalCnss)}</td>
                  <td className="px-4 py-3 text-right text-body-md text-error">{fmt(cycle.totalTax)}</td>
                  <td className="px-4 py-3 text-right text-body-md font-bold text-tertiary">{fmt(cycle.totalNet)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => router.push(`/payroll/${cycle.id}`)}
                        className="p-1 rounded hover:bg-surface-variant text-secondary hover:text-primary transition-colors"
                        title="Voir le détail"
                      >
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(cycle.id)}
                        className="p-1 rounded hover:bg-surface-variant text-secondary hover:text-error transition-colors"
                        title="Supprimer"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl shadow-level-3 border border-outline-variant w-[440px]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <h2 className="text-title-sm font-semibold text-on-surface">Créer un cycle de paie</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-full hover:bg-surface-container-high text-secondary">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-caption text-secondary mb-1">Mois</label>
                  <div className="relative">
                    <select
                      value={newMonth}
                      onChange={e => setNewMonth(parseInt(e.target.value))}
                      className="w-full appearance-none pl-3 pr-7 py-2 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    >
                      {MONTHS_FR_LONG.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[14px] text-on-surface-variant pointer-events-none">expand_more</span>
                  </div>
                </div>
                <div>
                  <label className="block text-caption text-secondary mb-1">Année</label>
                  <div className="relative">
                    <select
                      value={newYear}
                      onChange={e => setNewYear(parseInt(e.target.value))}
                      className="w-full appearance-none pl-3 pr-7 py-2 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    >
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[14px] text-on-surface-variant pointer-events-none">expand_more</span>
                  </div>
                </div>
              </div>

              {/* Preview card */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant">calendar_today</span>
                    <span className="text-body-md font-medium capitalize">{MONTHS_FR[newMonth - 1]} {newYear}</span>
                  </div>
                  <span className="text-caption text-secondary flex items-center gap-1">
                    🇹🇬 TG
                  </span>
                </div>
                {loadingPreview ? (
                  <p className="text-caption text-secondary animate-pulse">Chargement...</p>
                ) : (
                  <p className="text-caption text-secondary">
                    {previewCount === 0
                      ? 'Aucun employé actif avec contrat trouvé pour cette période.'
                      : `${previewCount} employé${(previewCount ?? 0) > 1 ? 's' : ''} actif${(previewCount ?? 0) > 1 ? 's' : ''} avec contrat trouvé${(previewCount ?? 0) > 1 ? 's' : ''}.`
                    }
                  </p>
                )}
              </div>

              {createError && (
                <div className="bg-error-container text-on-error-container p-3 rounded-lg text-body-md">{createError}</div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-outline-variant">
              <button onClick={() => setShowCreate(false)} className="px-4 py-1.5 border border-outline-variant rounded-lg text-body-md text-secondary hover:bg-surface-container-low">
                Annuler
              </button>
              <button onClick={handleCreate} disabled={creating} className="btn-primary">
                {creating ? 'Création...' : 'Créer le cycle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-surface p-5 rounded-xl shadow-level-3 border border-outline-variant w-80">
            <p className="text-body-md mb-4">Supprimer ce cycle de paie ? Cette action est irréversible.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 border border-outline text-secondary rounded-lg text-label-md hover:bg-surface-container-low">Annuler</button>
              <button onClick={handleDelete} className="px-3 py-1.5 bg-error text-on-error rounded-lg text-label-md hover:opacity-90">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
