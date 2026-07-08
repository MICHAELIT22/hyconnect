'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface ComplianceCheck {
  id: string
  title: string
  description: string
  category: string
  status: 'OK' | 'WARNING' | 'ERROR'
  affected: number | null
  affectedEmployees: Array<{ id: number; name: string; matricule: string }>
  actionLabel: string | null
  actionHref: string | null
}

interface ComplianceData {
  checks: ComplianceCheck[]
  score: number
  errors: number
  warnings: number
  ok: number
}

export default function PayrollCompliancePage() {
  const router = useRouter()
  const [data, setData] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('Tous')
  const [filterStatus, setFilterStatus] = useState('Tous')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    axios.get('/api/payroll/compliance').then(r => setData(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const categories = data ? ['Tous', ...new Set(data.checks.map(c => c.category))] : ['Tous']

  const filtered = data?.checks.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    const matchCat = filterCategory === 'Tous' || c.category === filterCategory
    const matchStatus = filterStatus === 'Tous' ||
      (filterStatus === 'Échoués' && c.status === 'ERROR') ||
      (filterStatus === 'Avertissements' && c.status === 'WARNING') ||
      (filterStatus === 'Réussis' && c.status === 'OK')
    return matchSearch && matchCat && matchStatus
  }) ?? []

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'OK') return (
      <div className="w-6 h-6 rounded-full border-2 border-tertiary flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-[13px] text-tertiary">check</span>
      </div>
    )
    if (status === 'WARNING') return (
      <div className="w-6 h-6 rounded-full border-2 border-warning flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-[13px] text-warning">warning</span>
      </div>
    )
    return (
      <div className="w-6 h-6 rounded-full border-2 border-error flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-[13px] text-error">close</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-md font-semibold text-on-surface">Conformité Paie</h1>
          <p className="text-body-md text-on-surface-variant">Vérifiez la conformité de votre paie avec toutes les exigences réglementaires</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary">
          <span className={`material-symbols-outlined text-[13px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          Relancer les vérifications
        </button>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Score de conformité', value: `${data.score}%`, color: data.score >= 80 ? 'text-tertiary' : data.score >= 50 ? 'text-warning' : 'text-error' },
            { label: 'Échoués', value: data.errors, color: 'text-on-surface' },
            { label: 'Avertissements', value: data.warnings, color: 'text-on-surface' },
            { label: 'Réussis', value: data.ok, color: 'text-on-surface' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-surface rounded-xl border border-outline-variant p-4">
              <p className="text-caption text-on-surface-variant">{kpi.label}</p>
              <p className={`text-display-lg font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-surface rounded-xl border border-outline-variant p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une vérification..."
              className="w-full pl-8 pr-3 py-1.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {[
            { value: filterCategory, setter: setFilterCategory, options: categories, label: 'Catégorie' },
            { value: filterStatus, setter: setFilterStatus, options: ['Tous', 'Échoués', 'Avertissements', 'Réussis'], label: 'Statut' },
          ].map(({ value, setter, options }) => (
            <div key={options[0]} className="relative">
              <select
                value={value}
                onChange={e => setter(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {options.map(o => <option key={o}>{o}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-on-surface-variant pointer-events-none">expand_more</span>
            </div>
          ))}
          <div className="relative">
            <select
              className="appearance-none pl-3 pr-7 py-1.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none"
            >
              <option>Sévérité</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-on-surface-variant pointer-events-none">expand_more</span>
          </div>
        </div>

        {/* Table */}
        <div>
          {/* Header row */}
          <div className="grid grid-cols-[28px_1fr_120px_100px_120px] gap-3 px-2 py-2 border-b border-outline-variant">
            <div />
            <span className="text-label-md font-semibold text-on-surface-variant uppercase">Vérification</span>
            <span className="text-label-md font-semibold text-on-surface-variant uppercase">Catégorie</span>
            <span className="text-label-md font-semibold text-on-surface-variant uppercase">Concernés</span>
            <div />
          </div>

          {loading ? (
            Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-14 bg-surface-variant rounded animate-pulse my-1" />
            ))
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-on-surface-variant text-body-md">Aucune vérification trouvée</div>
          ) : (
            filtered.map(check => (
              <div key={check.id} className="border-b border-outline-variant last:border-0">
                <div
                  className="grid grid-cols-[28px_1fr_120px_100px_120px] gap-3 px-2 py-3 items-center hover:bg-surface-container-lowest cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expandedId === check.id ? null : check.id)}
                >
                  <StatusIcon status={check.status} />
                  <div>
                    <p className="text-body-md font-semibold text-on-surface">{check.title}</p>
                    <p className="text-caption text-primary">{check.description}</p>
                  </div>
                  <div>
                    <span className="text-caption px-2 py-0.5 rounded border border-outline-variant bg-surface-container text-on-surface-variant">
                      {check.category}
                    </span>
                  </div>
                  <div className="text-body-md font-semibold text-on-surface text-center">
                    {check.affected === null ? '—' : check.affected}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {check.actionLabel && check.actionHref && (
                      <button
                        onClick={e => { e.stopPropagation(); router.push(check.actionHref!) }}
                        className="text-body-md text-primary hover:underline flex items-center gap-0.5 whitespace-nowrap"
                      >
                        {check.actionLabel}
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </button>
                    )}
                    {(!check.actionLabel || !check.actionHref) && (
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                        {expandedId === check.id ? 'expand_less' : 'chevron_right'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded: affected employees */}
                {expandedId === check.id && check.affectedEmployees.length > 0 && (
                  <div className="px-10 pb-3">
                    <div className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
                      <div className="px-3 py-2 border-b border-outline-variant">
                        <span className="text-caption font-semibold text-on-surface-variant uppercase">Employés concernés</span>
                      </div>
                      <div className="divide-y divide-outline-variant">
                        {check.affectedEmployees.map(emp => (
                          <div key={emp.id} className="flex items-center justify-between px-3 py-2">
                            <div>
                              <span className="text-body-md text-on-surface">{emp.name}</span>
                              <span className="text-caption text-secondary ml-2">{emp.matricule}</span>
                            </div>
                            <button
                              onClick={() => router.push(`/employees/${emp.id}?edit=true`)}
                              className="text-caption text-primary hover:underline flex items-center gap-0.5"
                            >
                              Modifier
                              <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
