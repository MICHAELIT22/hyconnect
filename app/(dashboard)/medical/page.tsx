'use client'

import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'

interface MedicalVisit {
  id: number
  date: string
  doctor: string | null
  center: string | null
  result: string | null
  nextVisit: string | null
  employee: { id: number; firstName: string; lastName: string; department: string; matricule: string } | null
}

const emptyForm = { employeeId: '', date: '', doctor: '', center: '', result: '', nextVisit: '' }

export default function MedicalPage() {
  const [visits, setVisits] = useState<MedicalVisit[]>([])
  const [employees, setEmployees] = useState<{ id: number; firstName: string; lastName: string; matricule: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const fetchVisits = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/medical-visits')
      setVisits(res.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchVisits() }, [fetchVisits])
  useEffect(() => { axios.get('/api/employees?limit=500').then(r => setEmployees(r.data)).catch(() => {}) }, [])

  async function exportCSV() {
    const res = await axios.get('/api/medical-visits?type=export', { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a'); a.href = url; a.download = 'visites-medicales.csv'; a.click()
  }

  async function handleSave() {
    if (!form.employeeId || !form.date) return
    setSaving(true)
    try {
      const payload = { employeeId: parseInt(form.employeeId), date: form.date, doctor: form.doctor || null, center: form.center || null, result: form.result || null, nextVisit: form.nextVisit || null }
      if (editingId) { await axios.put(`/api/medical-visits/${editingId}`, payload) }
      else { await axios.post('/api/medical-visits', payload) }
      setShowModal(false); fetchVisits()
    } catch (err: any) { alert('Erreur: ' + (err.response?.data?.error || err.message)) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    await axios.delete(`/api/medical-visits/${id}`)
    setDeleteConfirm(null); fetchVisits()
  }

  function openCreate() { setEditingId(null); setForm(emptyForm); setShowModal(true) }
  function openEdit(v: MedicalVisit) {
    setEditingId(v.id)
    setForm({ employeeId: String(v.employee?.id || ''), date: v.date ? v.date.split('T')[0] : '', doctor: v.doctor || '', center: v.center || '', result: v.result || '', nextVisit: v.nextVisit ? v.nextVisit.split('T')[0] : '' })
    setShowModal(true)
  }

  function getResultColor(result: string | null) {
    if (!result) return 'text-on-surface-variant'
    const r = result.toLowerCase()
    if (r.includes('apte') || r.includes('bon')) return 'text-success'
    if (r.includes('inapte') || r.includes('mauvais')) return 'text-error'
    return 'text-warning'
  }

  const ic = 'w-full px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-body-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-md font-semibold text-on-surface">Visites médicales</h1>
          <p className="text-body-md text-secondary">{visits.length} visite(s) enregistrée(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary">
            <span className="material-symbols-outlined text-[15px]">download</span>
            Exporter CSV
          </button>
          <button onClick={openCreate} className="btn-primary">
            <span className="material-symbols-outlined text-[15px]">add</span>
            Nouvelle visite
          </button>
        </div>
      </div>

      {!loading && visits.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total visites', value: visits.length, color: 'text-primary', bg: 'bg-primary/10', icon: 'medical_services' },
            { label: 'Aptes', value: visits.filter(v => v.result?.toLowerCase().includes('apte') && !v.result?.toLowerCase().includes('inapte')).length, color: 'text-success', bg: 'bg-success-container', icon: 'check_circle' },
            { label: 'Inaptes', value: visits.filter(v => v.result?.toLowerCase().includes('inapte')).length, color: 'text-error', bg: 'bg-error-container', icon: 'cancel' },
            { label: 'En retard', value: visits.filter(v => v.nextVisit && new Date(v.nextVisit) < new Date()).length, color: 'text-warning', bg: 'bg-warning-container', icon: 'schedule' },
          ].map(k => (
            <div key={k.label} className="card flex items-center gap-3">
              <div className={`w-10 h-10 ${k.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <span className={`material-symbols-outlined ${k.color} text-[18px]`}>{k.icon}</span>
              </div>
              <div>
                <p className={`text-title-md font-semibold ${k.color}`}>{k.value}</p>
                <p className="text-body-md text-on-surface-variant">{k.label}</p>
              </div>
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
                <th className="text-left px-3 py-2 text-label-md font-semibold text-on-surface-variant uppercase">Date visite</th>
                <th className="text-left px-3 py-2 text-label-md font-semibold text-on-surface-variant uppercase">Médecin</th>
                <th className="text-left px-3 py-2 text-label-md font-semibold text-on-surface-variant uppercase">Centre</th>
                <th className="text-left px-3 py-2 text-label-md font-semibold text-on-surface-variant uppercase">Résultat</th>
                <th className="text-left px-3 py-2 text-label-md font-semibold text-on-surface-variant uppercase">Prochaine visite</th>
                <th className="text-right px-3 py-2 text-label-md font-semibold text-on-surface-variant uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-outline-variant animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-3 py-1.5"><div className="h-4 bg-surface-variant rounded" /></td>)}
                  </tr>
                ))
              ) : visits.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-on-surface-variant">Aucune visite médicale enregistrée</td></tr>
              ) : (
                visits.map(v => {
                  const nextDays = v.nextVisit ? Math.ceil((new Date(v.nextVisit).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
                  return (
                    <tr key={v.id} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors group">
                      <td className="px-3 py-1.5">
                        <p className="font-medium text-on-surface text-body-lg">{v.employee ? `${v.employee.firstName} ${v.employee.lastName}` : '—'}</p>
                        <p className="text-caption text-on-surface-variant">{v.employee?.department || ''}</p>
                      </td>
                      <td className="px-3 py-1.5 text-body-md text-on-surface-variant">{new Date(v.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-3 py-1.5 text-body-md text-on-surface-variant">{v.doctor || '—'}</td>
                      <td className="px-3 py-1.5 text-body-md text-on-surface-variant">{v.center || '—'}</td>
                      <td className={`px-3 py-1.5 font-medium text-body-md ${getResultColor(v.result)}`}>{v.result || '—'}</td>
                      <td className="px-3 py-1.5">
                        {v.nextVisit ? (
                          <div>
                            <p className="text-body-md text-on-surface-variant">{new Date(v.nextVisit).toLocaleDateString('fr-FR')}</p>
                            {nextDays !== null && nextDays <= 30 && nextDays > 0 && <span className="text-caption text-warning">Dans {nextDays}j</span>}
                            {nextDays !== null && nextDays <= 0 && <span className="text-caption text-error">En retard</span>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-surface-variant text-secondary hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>
                          <button onClick={() => setDeleteConfirm(v.id)} className="p-1.5 rounded-lg hover:bg-error-container text-secondary hover:text-error transition-colors">
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
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-level-3 border border-outline-variant w-[480px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
              <h3 className="text-title-sm font-semibold text-on-surface">{editingId ? 'Modifier la visite' : 'Nouvelle visite médicale'}</h3>
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
                <div>
                  <label className="label">Date de visite *</label>
                  <input type="date" className={ic} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Prochaine visite</label>
                  <input type="date" className={ic} value={form.nextVisit} onChange={e => setForm(f => ({ ...f, nextVisit: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Médecin</label>
                  <input className={ic} value={form.doctor} onChange={e => setForm(f => ({ ...f, doctor: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Centre médical</label>
                  <input className={ic} value={form.center} onChange={e => setForm(f => ({ ...f, center: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="label">Résultat</label>
                  <input className={ic} value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))} placeholder="Ex: Apte au travail" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-outline-variant">
              <button onClick={() => setShowModal(false)} className="px-3 py-1.5 border border-outline text-secondary rounded-lg text-label-md hover:bg-surface-container-low">Annuler</button>
              <button onClick={handleSave} disabled={saving || !form.employeeId || !form.date} className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-label-md hover:bg-primary-fixed-variant disabled:opacity-50 transition-colors">
                {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-surface p-5 rounded-xl shadow-level-3 border border-outline-variant w-80">
            <p className="text-body-lg font-medium mb-4">Supprimer cette visite médicale ?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 border border-outline text-secondary rounded-lg text-label-md hover:bg-surface-container-low">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-3 py-1.5 bg-error text-on-error rounded-lg text-label-md hover:opacity-90">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
