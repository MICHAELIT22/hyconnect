'use client'

import { useState, useCallback } from 'react'
import axios from 'axios'
import useSWR from 'swr'

interface Training {
  id: number
  title: string
  organization: string
  date: string
  cost: number | null
  certificate: boolean
  duration: number | null
  category: string | null
  employee: { id: number; firstName: string; lastName: string; department: string; matricule: string } | null
}

const CATEGORIES = ['Technique', 'Management', 'Sécurité', 'Informatique', 'Autre']

const emptyForm = { employeeId: '', title: '', organization: '', date: '', duration: '', cost: '', category: '', certificate: false }
const ic = 'w-full px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

export default function TrainingsPage() {
  const [category, setCategory] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<typeof emptyForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const trainingsUrl = `/api/trainings?${new URLSearchParams({ ...(category && { category }) })}`
  const { data: trainings = [], isLoading: loading, mutate: mutateTrainings } = useSWR<Training[]>(trainingsUrl)
  const { data: employees = [] } = useSWR<{ id: number; firstName: string; lastName: string; matricule: string }[]>('/api/employees?limit=500')

  const fetchTrainings = useCallback(() => mutateTrainings(), [mutateTrainings])

  async function exportCSV() {
    const res = await axios.get('/api/trainings?type=export', { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a'); a.href = url; a.download = 'formations.csv'; a.click()
  }

  async function handleSave() {
    if (!form.employeeId || !form.title || !form.organization || !form.date) return
    setSaving(true)
    try {
      const payload = {
        employeeId: parseInt(form.employeeId),
        title: form.title,
        organization: form.organization,
        date: form.date,
        duration: form.duration ? parseInt(form.duration) : null,
        cost: form.cost ? parseFloat(form.cost) : null,
        category: form.category || null,
        certificate: form.certificate,
      }
      if (editingId) { await axios.put(`/api/trainings/${editingId}`, payload) }
      else { await axios.post('/api/trainings', payload) }
      setShowModal(false); fetchTrainings()
    } catch (err: any) { alert('Erreur: ' + (err.response?.data?.error || err.message)) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    await axios.delete(`/api/trainings/${id}`)
    setDeleteConfirm(null); fetchTrainings()
  }

  function openCreate() { setEditingId(null); setForm(emptyForm); setShowModal(true) }
  function openEdit(t: Training) {
    setEditingId(t.id)
    setForm({ employeeId: String(t.employee?.id || ''), title: t.title, organization: t.organization, date: t.date ? t.date.split('T')[0] : '', duration: String(t.duration || ''), cost: String(t.cost || ''), category: t.category || '', certificate: t.certificate })
    setShowModal(true)
  }

  const filtered = trainings.filter(t => !search || [t.title, t.organization, t.employee?.firstName, t.employee?.lastName].some(v => v?.toLowerCase().includes(search.toLowerCase())))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-md font-semibold text-on-surface">Formations</h1>
          <p className="text-body-md text-secondary">{filtered.length} formation(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary">
            <span className="material-symbols-outlined text-[15px]">download</span>
            Exporter CSV
          </button>
          <button onClick={openCreate} className="btn-primary">
            <span className="material-symbols-outlined text-[15px]">add</span>
            Nouvelle formation
          </button>
        </div>
      </div>

      <div className="p-3 border border-outline-variant rounded-xl bg-surface flex flex-wrap gap-2 items-center">
        <div className="relative w-56">
          <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-[13px]">search</span>
          <input
            className="w-full pl-7 pr-2 py-1 bg-surface border border-outline-variant rounded text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="border border-outline-variant rounded text-body-md bg-surface-container py-1 px-2" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {!loading && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total formations', value: trainings.length, color: 'text-primary', bg: 'bg-primary/10', icon: 'school' },
            { label: 'Employés formés', value: new Set(trainings.map(t => t.employee?.id).filter(Boolean)).size, color: 'text-secondary', bg: 'bg-surface-variant', icon: 'group' },
            { label: 'Taux certification', value: Math.round((trainings.filter(t => t.certificate).length / Math.max(trainings.length, 1)) * 100) + '%', color: 'text-success', bg: 'bg-success-container', icon: 'workspace_premium' },
            { label: 'Coût total', value: trainings.reduce((s, t) => s + (t.cost || 0), 0).toLocaleString('fr-FR') + ' FCFA', color: 'text-error', bg: 'bg-error-container', icon: 'payments' },
            { label: 'Coût moyen', value: Math.round(trainings.filter(t=>t.cost).reduce((s,t)=>s+(t.cost||0),0)/Math.max(trainings.filter(t=>t.cost).length,1)).toLocaleString('fr-FR') + ' FCFA', color: 'text-warning', bg: 'bg-warning-container', icon: 'trending_up' },
            { label: 'Cette année', value: trainings.filter(t => t.date && new Date(t.date).getFullYear() === new Date().getFullYear()).length, color: 'text-primary', bg: 'bg-primary/10', icon: 'calendar_today' },
          ].map(k => (
            <div key={k.label} className="card flex flex-col items-center justify-center text-center gap-1 py-2">
              <div className={`w-8 h-8 ${k.bg} rounded-xl flex items-center justify-center`}>
                <span className={`material-symbols-outlined ${k.color} text-[15px]`}>{k.icon}</span>
              </div>
              <p className={`text-title-sm font-semibold ${k.color}`}>{k.value}</p>
              <p className="text-caption text-on-surface-variant leading-tight">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-lowest">
                <th className="text-left px-3 py-2 text-label-md font-semibold text-on-surface-variant uppercase">Employé</th>
                <th className="text-left px-3 py-2 text-label-md font-semibold text-on-surface-variant uppercase">Formation</th>
                <th className="text-left px-3 py-2 text-label-md font-semibold text-on-surface-variant uppercase">Organisme</th>
                <th className="text-left px-3 py-2 text-label-md font-semibold text-on-surface-variant uppercase">Date</th>
                <th className="text-left px-3 py-2 text-label-md font-semibold text-on-surface-variant uppercase">Durée</th>
                <th className="text-left px-3 py-2 text-label-md font-semibold text-on-surface-variant uppercase">Coût</th>
                <th className="text-left px-3 py-2 text-label-md font-semibold text-on-surface-variant uppercase">Certificat</th>
                <th className="text-right px-3 py-2 text-label-md font-semibold text-on-surface-variant uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-outline-variant animate-pulse">
                    {Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-3 py-1.5"><div className="h-4 bg-surface-variant rounded" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-on-surface-variant">Aucune formation enregistrée</td></tr>
              ) : (
                filtered.map(t => (
                  <tr key={t.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors group">
                    <td className="px-3 py-1.5">
                      <p className="font-medium text-on-surface text-body-md">{t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : '—'}</p>
                      <p className="text-caption text-on-surface-variant">{t.employee?.department || ''}</p>
                    </td>
                    <td className="px-3 py-1.5">
                      <p className="font-medium text-on-surface text-body-md">{t.title}</p>
                      {t.category && <span className="text-caption bg-secondary-container px-2 py-0.5 rounded-full">{t.category}</span>}
                    </td>
                    <td className="px-3 py-1.5 text-body-md text-on-surface-variant">{t.organization}</td>
                    <td className="px-3 py-1.5 text-body-md text-on-surface-variant">{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-3 py-1.5 text-body-md text-on-surface-variant">{t.duration ? `${t.duration}h` : '—'}</td>
                    <td className="px-3 py-1.5 text-body-md text-on-surface-variant">{t.cost ? `${t.cost.toLocaleString('fr-FR')} FCFA` : '—'}</td>
                    <td className="px-3 py-1.5">
                      {t.certificate ? <span className="badge-active">Oui</span> : <span className="text-on-surface-variant text-body-md">Non</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-surface-variant text-secondary hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                        <button onClick={() => setDeleteConfirm(t.id)} className="p-1.5 rounded-lg hover:bg-error-container text-secondary hover:text-error transition-colors">
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-level-3 border border-outline-variant w-[520px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
              <h3 className="text-title-sm font-semibold text-on-surface">{editingId ? 'Modifier la formation' : 'Nouvelle formation'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-full hover:bg-surface-container-high text-secondary">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="label">Employé *</label>
                <select className={ic} value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} disabled={!!editingId}>
                  <option value="">Sélectionner un employé</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.matricule})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">Intitulé de la formation *</label>
                  <input className={ic} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="label">Organisme de formation *</label>
                  <input className={ic} value={form.organization} onChange={e => setForm(f => ({ ...f, organization: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className={ic} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Catégorie</label>
                  <select className={ic} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">Sans catégorie</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Durée (heures)</label>
                  <input type="number" className={ic} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Coût (FCFA)</label>
                  <input type="number" className={ic} value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="cert" checked={form.certificate} onChange={e => setForm(f => ({ ...f, certificate: e.target.checked }))} className="w-4 h-4 accent-primary" />
                  <label htmlFor="cert" className="text-body-lg text-on-surface cursor-pointer">Certificat obtenu</label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-outline-variant">
              <button onClick={() => setShowModal(false)} className="px-3 py-1.5 border border-outline text-secondary rounded-lg text-label-md hover:bg-surface-container-low">Annuler</button>
              <button onClick={handleSave} disabled={saving || !form.employeeId || !form.title || !form.organization || !form.date} className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-label-md hover:bg-primary-fixed-variant disabled:opacity-50 transition-colors">
                {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-level-3 w-full max-w-sm overflow-hidden">
            <div className="p-5 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[22px] text-error">school</span>
              </div>
              <h3 className="text-title-sm font-semibold text-on-surface mb-1">Supprimer la formation ?</h3>
              <p className="text-body-md text-secondary mb-4">Cette formation sera définitivement supprimée.</p>
              <div className="w-full p-3 bg-error-container/50 rounded-xl text-caption text-error text-left">
                Cette action est irréversible.
              </div>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-error text-on-error rounded-xl text-label-md font-semibold hover:opacity-90 transition-all">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
