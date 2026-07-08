'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface Contract {
  id: number
  contractNo: string
  type: string
  status: string
  startDate: string
  endDate: string | null
  trialEndDate: string | null
  salary: number
  bonus: number | null
  position: string | null
  department: string | null
  workerCategory: string | null
  annualLeaveDays: number | null
  workHours: string | null
  currency: string | null
  language: string | null
  payFrequency: string | null
  workDaysPerWeek: number | null
  employee: { id: number; firstName: string; lastName: string; matricule: string; photoPath?: string } | null
}

const CONTRACT_TYPES = ['CDI', 'CDD', 'Stage', 'Intérim', 'Apprentissage', 'Saisonnier']
const PAGE_SIZES = [10, 25, 50]

function initials(firstName: string, lastName: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
}

function daysUntilExpiry(endDate: string | null) {
  if (!endDate) return null
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default function ContractsPage() {
  const router = useRouter()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [department, setDepartment] = useState('')
  const [departments, setDepartments] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchContracts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (type) params.set('type', type)
      if (status) params.set('status', status)
      const res = await axios.get(`/api/contracts?${params}`)
      const data: Contract[] = res.data
      setContracts(data)
      // extract unique departments
      const depts = [...new Set(data.map(c => c.department).filter(Boolean))].sort() as string[]
      setDepartments(depts)
      setPage(1)
    } finally { setLoading(false) }
  }, [search, type, status])

  useEffect(() => {
    const t = setTimeout(fetchContracts, 300)
    return () => clearTimeout(t)
  }, [fetchContracts])

  const filtered = department ? contracts.filter(c => c.department === department) : contracts
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const cdi = contracts.filter(c => c.type === 'CDI').length
  const cdd = contracts.filter(c => c.type === 'CDD').length
  const expiring = contracts.filter(c => { const d = daysUntilExpiry(c.endDate); return d !== null && d <= 30 && d > 0 }).length
  const expired = contracts.filter(c => { const d = daysUntilExpiry(c.endDate); return d !== null && d <= 0 }).length

  const allSelected = paged.length > 0 && paged.every(c => selected.has(c.id))
  function toggleAll() {
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) paged.forEach(c => next.delete(c.id))
      else paged.forEach(c => next.add(c.id))
      return next
    })
  }
  function toggleOne(id: number) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleDelete(id: number) {
    setDeleting(true)
    try {
      await axios.delete(`/api/contracts/${id}`)
      setDeleteConfirm(null)
      fetchContracts()
    } finally { setDeleting(false) }
  }

  function exportCSV() {
    const rows = [
      ['N° Contrat', 'Employé', 'Matricule', 'Type', 'Département', 'Poste', 'Salaire', 'Début', 'Fin', 'Statut'],
      ...filtered.map(c => [
        c.contractNo,
        c.employee ? `${c.employee.firstName} ${c.employee.lastName}` : '',
        c.employee?.matricule ?? '',
        c.type,
        c.department ?? '',
        c.position ?? '',
        `${c.salary} ${c.currency ?? 'FCFA'}`,
        new Date(c.startDate).toLocaleDateString('fr-FR'),
        c.endDate ? new Date(c.endDate).toLocaleDateString('fr-FR') : '',
        c.status,
      ]),
    ]
    const csv = '﻿' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'contrats.csv'; a.click()
  }

  const KPI = [
    { label: 'Total contrats', value: contracts.length, icon: 'description', color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'CDI', value: cdi, icon: 'verified', color: 'text-success', bg: 'bg-success-container' },
    { label: 'CDD', value: cdd, icon: 'calendar_month', color: 'text-tertiary', bg: 'bg-tertiary-container' },
    { label: 'Expire bientôt', value: expiring, icon: 'warning', color: 'text-warning', bg: 'bg-warning-container' },
    { label: 'Rompus/Expirés', value: expired, icon: 'cancel', color: 'text-error', bg: 'bg-error-container' },
  ]

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3">
        {KPI.map(k => (
          <div key={k.label} className="card flex items-center gap-3">
            <div className={`w-10 h-10 ${k.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <span className={`material-symbols-outlined ${k.color} text-[20px]`}>{k.icon}</span>
            </div>
            <div>
              <p className="text-caption text-on-surface-variant">{k.label}</p>
              <p className={`text-title-md font-bold ${k.color}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="card p-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <h2 className="text-title-sm font-semibold text-on-surface">Contrats</h2>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="btn-secondary">
              <span className="material-symbols-outlined text-[15px]">download</span>
              Export
            </button>
            <button onClick={() => router.push('/contracts/new')} className="btn-primary">
              <span className="material-symbols-outlined text-[15px]">add</span>
              Nouveau contrat
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-2.5 border-b border-outline-variant flex flex-wrap items-center gap-2 bg-surface-container-lowest">
          <div className="relative flex-1 min-w-48 max-w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">search</span>
            <input
              className="w-full pl-9 pr-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            value={type} onChange={e => setType(e.target.value)}
          >
            <option value="">Type</option>
            {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            className="px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            value={status} onChange={e => setStatus(e.target.value)}
          >
            <option value="">Statut</option>
            <option value="ACTIVE">Actif</option>
            <option value="EXPIRED">Expiré</option>
            <option value="TERMINATED">Résilié</option>
          </select>
          <select
            className="px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            value={department} onChange={e => setDepartment(e.target.value)}
          >
            <option value="">Département</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-lowest">
                <th className="px-3 py-2.5 w-9">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="w-4 h-4 rounded border-outline-variant accent-primary cursor-pointer" />
                </th>
                <th className="text-left px-3 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase tracking-wide">Employé</th>
                <th className="text-left px-3 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase tracking-wide">N° Contrat</th>
                <th className="text-left px-3 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase tracking-wide">Type</th>
                <th className="text-right px-3 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase tracking-wide">Salaire</th>
                <th className="text-left px-3 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase tracking-wide">Début</th>
                <th className="text-left px-3 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase tracking-wide">Fin</th>
                <th className="text-left px-3 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase tracking-wide">Jours rest.</th>
                <th className="text-left px-3 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase tracking-wide">Statut</th>
                <th className="text-right px-3 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-outline-variant animate-pulse">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-3 py-2"><div className="h-4 bg-surface-variant rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl block mb-2">description</span>
                    Aucun contrat trouvé
                  </td>
                </tr>
              ) : (
                paged.map(c => {
                  const days = daysUntilExpiry(c.endDate)
                  const isExpiring = days !== null && days <= 30 && days > 0
                  const isExpired = days !== null && days <= 0
                  return (
                    <tr key={c.id} className={`border-b border-outline-variant hover:bg-surface-container-lowest transition-colors group ${selected.has(c.id) ? 'bg-primary/5' : ''}`}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)}
                          className="w-4 h-4 rounded border-outline-variant accent-primary cursor-pointer" />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          {c.employee?.photoPath ? (
                            <img src={c.employee.photoPath} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-outline-variant" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary-container text-primary text-caption font-bold flex items-center justify-center flex-shrink-0">
                              {c.employee ? initials(c.employee.firstName, c.employee.lastName) : '?'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-body-md text-on-surface truncate">
                              {c.employee ? `${c.employee.firstName} ${c.employee.lastName}` : '—'}
                            </p>
                            <p className="text-caption text-on-surface-variant">{c.employee?.matricule}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-body-md text-on-surface-variant">{c.contractNo}</td>
                      <td className="px-3 py-2">
                        <span className={`text-caption font-semibold px-2 py-0.5 rounded-full ${c.type === 'CDI' ? 'bg-primary/10 text-primary' : c.type === 'CDD' ? 'bg-tertiary-container text-tertiary' : 'bg-secondary-container text-on-surface'}`}>
                          {c.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-body-md text-on-surface whitespace-nowrap">
                        {c.salary.toLocaleString('fr-FR')} {c.currency ?? 'FCFA'}
                      </td>
                      <td className="px-3 py-2 text-body-md text-on-surface-variant whitespace-nowrap">
                        {new Date(c.startDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-3 py-2 text-body-md text-on-surface-variant whitespace-nowrap">
                        {c.endDate ? new Date(c.endDate).toLocaleDateString('fr-FR') : <span className="text-caption text-on-surface-variant italic">Indéterminé</span>}
                      </td>
                      <td className="px-3 py-2">
                        {days === null ? (
                          <span className="text-caption text-on-surface-variant">—</span>
                        ) : isExpired ? (
                          <span className="text-caption font-semibold text-error">Expiré</span>
                        ) : (
                          <span className={`text-caption font-semibold ${isExpiring ? 'text-warning' : 'text-on-surface-variant'}`}>{days} j</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {c.status === 'ACTIVE'
                          ? <span className="badge-active">Actif</span>
                          : c.status === 'TERMINATED'
                          ? <span className="badge-inactive">Résilié</span>
                          : <span className="badge-pending">{c.status}</span>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => router.push(`/contracts/${c.id}/view`)}
                            className="p-1.5 rounded-lg hover:bg-surface-variant text-secondary hover:text-primary transition-colors"
                            title="Voir"
                          >
                            <span className="material-symbols-outlined text-[15px]">visibility</span>
                          </button>
                          <button
                            onClick={() => router.push(`/contracts/${c.id}/edit`)}
                            className="p-1.5 rounded-lg hover:bg-surface-variant text-secondary hover:text-primary transition-colors"
                            title="Modifier"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>
                          <button
                            onClick={() => {
                              // duplicate
                              router.push(`/contracts/new?from=${c.id}`)
                            }}
                            className="p-1.5 rounded-lg hover:bg-surface-variant text-secondary hover:text-primary transition-colors"
                            title="Dupliquer"
                          >
                            <span className="material-symbols-outlined text-[15px]">content_copy</span>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(c.id)}
                            className="p-1.5 rounded-lg hover:bg-error-container text-secondary hover:text-error transition-colors"
                            title="Supprimer"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-outline-variant bg-surface-container-lowest">
            <div className="flex items-center gap-2 text-caption text-on-surface-variant">
              <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} sur {filtered.length}</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(parseInt(e.target.value)); setPage(1) }}
                className="ml-2 px-2 py-0.5 bg-surface border border-outline-variant rounded text-caption text-on-surface"
              >
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded-lg hover:bg-surface-variant disabled:opacity-40 text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1).map((p, idx, arr) => (
                <span key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-caption text-on-surface-variant">…</span>}
                  <button
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-caption font-medium transition-colors ${p === page ? 'bg-primary text-on-primary' : 'hover:bg-surface-variant text-on-surface-variant'}`}
                  >
                    {p}
                  </button>
                </span>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded-lg hover:bg-surface-variant disabled:opacity-40 text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-surface p-5 rounded-xl shadow-level-3 border border-outline-variant w-80 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-error-container rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-error">delete</span>
              </div>
              <div>
                <p className="text-body-lg font-semibold text-on-surface">Supprimer ce contrat ?</p>
                <p className="text-body-md text-on-surface-variant mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Annuler</button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="px-3 py-1.5 bg-error text-on-error rounded-lg text-label-md hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
