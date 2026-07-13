'use client'

import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'

interface Leave {
  id: number
  type: string
  startDate: string
  endDate: string
  reason: string | null
  status: string
  employee: { id: number; firstName: string; lastName: string; matricule: string; department: string } | null
}

const LEAVE_TYPES = ['ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER']
const LEAVE_LABELS: Record<string, string> = {
  ANNUAL: 'Congé annuel', SICK: 'Maladie', MATERNITY: 'Maternité',
  PATERNITY: 'Paternité', UNPAID: 'Sans solde', OTHER: 'Autre',
}

const emptyForm = { employeeId: '', type: 'ANNUAL', startDate: '', endDate: '', reason: '', status: 'PENDING' }

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [employees, setEmployees] = useState<{ id: number; firstName: string; lastName: string; matricule: string }[]>([])
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const fetchLeaves = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (type) params.set('type', type)
      if (status) params.set('status', status)
      const res = await axios.get(`/api/leaves?${params}`)
      setLeaves(res.data)
    } finally { setLoading(false) }
  }, [type, status])

  useEffect(() => { fetchLeaves() }, [fetchLeaves])

  useEffect(() => {
    axios.get('/api/employees?limit=500').then(r => setEmployees(r.data)).catch(() => {})
  }, [])

  async function updateStatus(id: number, newStatus: string) {
    await axios.put(`/api/leaves/${id}`, { status: newStatus })
    fetchLeaves()
  }

  async function handleSave() {
    if (!form.employeeId || !form.startDate || !form.endDate) return
    setSaving(true)
    try {
      const payload = {
        employeeId: parseInt(form.employeeId),
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason || null,
        status: form.status,
      }
      if (editingId) {
        await axios.put(`/api/leaves/${editingId}`, payload)
      } else {
        await axios.post('/api/leaves', payload)
      }
      setShowModal(false)
      fetchLeaves()
    } catch (err: any) {
      alert('Erreur: ' + (err.response?.data?.error || err.message))
    } finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    await axios.delete(`/api/leaves/${id}`)
    setDeleteConfirm(null)
    fetchLeaves()
  }

  function openCreate() { setEditingId(null); setForm(emptyForm); setShowModal(true) }
  function openEdit(l: Leave) {
    setEditingId(l.id)
    setForm({
      employeeId: String(l.employee?.id || ''),
      type: l.type,
      startDate: l.startDate ? l.startDate.split('T')[0] : '',
      endDate: l.endDate ? l.endDate.split('T')[0] : '',
      reason: l.reason || '',
      status: l.status,
    })
    setShowModal(true)
  }

  const calcDays = (start: string, end: string) =>
    Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1

  const pending = leaves.filter(l => l.status === 'PENDING').length
  const approved = leaves.filter(l => l.status === 'APPROVED').length
  const inProgress = leaves.filter(l => l.status === 'APPROVED' && new Date(l.startDate) <= new Date() && new Date(l.endDate) >= new Date()).length

  const ic = 'w-full px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-body-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-md font-semibold text-on-surface">Congés &amp; Absences</h1>
          <p className="text-body-md text-secondary">{leaves.length} demande(s)</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <span className="material-symbols-outlined text-[15px]">add</span>
          Nouvelle demande
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: leaves.length, color: 'text-primary', bg: 'bg-primary/10', icon: 'event_busy' },
          { label: 'En attente', value: pending, color: 'text-warning', bg: 'bg-warning-container', icon: 'schedule' },
          { label: 'Approuvés', value: approved, color: 'text-success', bg: 'bg-success-container', icon: 'check_circle' },
          { label: 'En cours', value: inProgress, color: 'text-tertiary', bg: 'bg-tertiary-container', icon: 'directions_run' },
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

      <div className="card flex gap-3">
        <select className={`${ic} w-48`} value={type} onChange={e => setType(e.target.value)}>
          <option value="">Tous types</option>
          {LEAVE_TYPES.map(t => <option key={t} value={t}>{LEAVE_LABELS[t]}</option>)}
        </select>
        <select className={`${ic} w-40`} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Tous statuts</option>
          <option value="PENDING">En attente</option>
          <option value="APPROVED">Approuvé</option>
          <option value="REJECTED">Refusé</option>
        </select>
      </div>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-surface-variant rounded-xl animate-pulse" />)
        ) : leaves.length === 0 ? (
          <div className="card text-center py-12 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl block mb-2">event_available</span>
            Aucune demande de congé
          </div>
        ) : (
          leaves.map(leave => (
            <div key={leave.id} className="card flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-on-surface text-body-lg">
                    {leave.employee ? `${leave.employee.firstName} ${leave.employee.lastName}` : '—'}
                  </p>
                  {leave.employee?.department && (
                    <span className="text-caption text-on-surface-variant">· {leave.employee.department}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-caption bg-secondary-container text-on-surface px-2 py-0.5 rounded-full">
                    {LEAVE_LABELS[leave.type] || leave.type}
                  </span>
                  <span className="text-body-md text-on-surface-variant">
                    {new Date(leave.startDate).toLocaleDateString('fr-FR')} → {new Date(leave.endDate).toLocaleDateString('fr-FR')}
                  </span>
                  <span className="font-medium text-on-surface text-body-md">{calcDays(leave.startDate, leave.endDate)} jour(s)</span>
                </div>
                {leave.reason && <p className="text-body-md text-on-surface-variant mt-1 truncate">{leave.reason}</p>}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={leave.status === 'APPROVED' ? 'badge-active' : leave.status === 'REJECTED' ? 'badge-inactive' : 'badge-pending'}>
                  {leave.status === 'APPROVED' ? 'Approuvé' : leave.status === 'REJECTED' ? 'Refusé' : 'En attente'}
                </span>
                {leave.status === 'PENDING' && (
                  <>
                    <button onClick={() => updateStatus(leave.id, 'APPROVED')} className="p-1.5 rounded-lg bg-success-container text-success hover:opacity-80 transition-opacity" title="Approuver">
                      <span className="material-symbols-outlined text-[15px]">check</span>
                    </button>
                    <button onClick={() => updateStatus(leave.id, 'REJECTED')} className="p-1.5 rounded-lg bg-error-container text-error hover:opacity-80 transition-opacity" title="Refuser">
                      <span className="material-symbols-outlined text-[15px]">close</span>
                    </button>
                  </>
                )}
                {leave.status !== 'PENDING' && (
                  <button onClick={() => updateStatus(leave.id, 'PENDING')} className="p-1.5 rounded-lg hover:bg-surface-container text-secondary hover:text-on-surface transition-colors" title="Remettre en attente">
                    <span className="material-symbols-outlined text-[15px]">undo</span>
                  </button>
                )}
                <button onClick={() => openEdit(leave)} className="p-1.5 rounded-lg hover:bg-surface-variant text-secondary hover:text-primary transition-colors" title="Modifier">
                  <span className="material-symbols-outlined text-[15px]">edit</span>
                </button>
                <button onClick={() => setDeleteConfirm(leave.id)} className="p-1.5 rounded-lg hover:bg-error-container text-secondary hover:text-error transition-colors" title="Supprimer">
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-level-3 border border-outline-variant w-[480px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
              <h3 className="text-title-sm font-semibold text-on-surface">
                {editingId ? 'Modifier la demande' : 'Nouvelle demande de congé'}
              </h3>
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
                  <label className="label">Type *</label>
                  <select className={ic} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {LEAVE_TYPES.map(t => <option key={t} value={t}>{LEAVE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Statut</label>
                  <select className={ic} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="PENDING">En attente</option>
                    <option value="APPROVED">Approuvé</option>
                    <option value="REJECTED">Refusé</option>
                  </select>
                </div>
                <div>
                  <label className="label">Date début *</label>
                  <input type="date" className={ic} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Date fin *</label>
                  <input type="date" className={ic} value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Motif</label>
                <textarea className={ic + ' resize-none'} rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-outline-variant">
              <button onClick={() => setShowModal(false)} className="px-3 py-1.5 border border-outline text-secondary rounded-lg text-label-md hover:bg-surface-container-low">Annuler</button>
              <button onClick={handleSave} disabled={saving || !form.employeeId || !form.startDate || !form.endDate} className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-label-md hover:bg-primary-fixed-variant disabled:opacity-50 transition-colors">
                {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-surface p-5 rounded-xl shadow-level-3 border border-outline-variant w-80">
            <p className="text-body-lg font-medium mb-4">Supprimer cette demande de congé ?</p>
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
