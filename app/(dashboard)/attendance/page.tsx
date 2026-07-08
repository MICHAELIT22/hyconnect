'use client'

import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'

interface AttendanceRecord {
  id: number
  date: string
  checkIn: string | null
  checkOut: string | null
  isLate: boolean
  absence: boolean
  overtime: number | null
  employee: { id: number; firstName: string; lastName: string; matricule: string; department: string }
}

interface Stats { present: number; absent: number; late: number; total: number; notRecorded: number }

const emptyForm = { employeeId: '', date: new Date().toISOString().split('T')[0], absence: false, checkIn: '', checkOut: '' }

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [repeatedLates, setRepeatedLates] = useState<any[]>([])
  const [employees, setEmployees] = useState<{ id: number; firstName: string; lastName: string; department: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  function getPeriodDates(p: string) {
    const now = new Date()
    const from = new Date()
    if (p === 'day') { from.setHours(0, 0, 0, 0) }
    else if (p === 'week') { from.setDate(now.getDate() - 7) }
    else if (p === 'month') { from.setDate(now.getDate() - 30) }
    return { from: from.toISOString().split('T')[0], to: now.toISOString().split('T')[0] }
  }

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '100')
      const df = period ? getPeriodDates(period).from : dateFrom
      const dt = period ? getPeriodDates(period).to : dateTo
      if (df) params.set('dateFrom', df)
      if (dt) params.set('dateTo', dt)
      if (employeeFilter) params.set('employeeId', employeeFilter)
      const res = await axios.get('/api/attendances?' + params)
      let recs: AttendanceRecord[] = res.data.records || []
      if (departmentFilter) recs = recs.filter(r => r.employee?.department === departmentFilter)
      if (statusFilter === 'present') recs = recs.filter(r => !r.absence)
      if (statusFilter === 'absent') recs = recs.filter(r => r.absence)
      setRecords(recs)
    } finally { setLoading(false) }
  }, [period, dateFrom, dateTo, employeeFilter, departmentFilter, statusFilter])

  useEffect(() => { fetchRecords() }, [fetchRecords])
  useEffect(() => {
    Promise.all([
      axios.get('/api/attendances/stats?type=today'),
      axios.get('/api/attendances/stats?type=repeated-lates'),
      axios.get('/api/employees?limit=500'),
    ]).then(([statsRes, latesRes, empRes]) => {
      setStats(statsRes.data)
      setRepeatedLates(latesRes.data || [])
      setEmployees(empRes.data || [])
    }).catch(() => {})
  }, [])

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))]

  async function handleSave() {
    if (!form.employeeId || !form.date) return
    setSaving(true)
    try {
      const payload = {
        employeeId: parseInt(form.employeeId),
        date: form.date,
        absence: form.absence,
        checkIn: form.absence ? null : (form.checkIn || null),
        checkOut: form.absence ? null : (form.checkOut || null),
        isLate: !form.absence && form.checkIn ? form.checkIn > '08:30' : false,
        overtime: null,
      }
      if (editingId) { await axios.put('/api/attendances/' + editingId, payload) }
      else { await axios.post('/api/attendances', payload) }
      setShowModal(false)
      fetchRecords()
    } catch (err: any) { alert('Erreur: ' + (err.response?.data?.error || err.message)) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    await axios.delete('/api/attendances/' + id)
    setDeleteConfirm(null)
    fetchRecords()
  }

  function openCreate() { setEditingId(null); setForm(emptyForm); setShowModal(true) }
  function openEdit(r: AttendanceRecord) {
    setEditingId(r.id)
    setForm({
      employeeId: String(r.employee?.id || ''),
      date: r.date ? r.date.split('T')[0] : '',
      absence: r.absence,
      checkIn: r.checkIn || '',
      checkOut: r.checkOut || '',
    })
    setShowModal(true)
  }

  const ic = 'w-full px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-body-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-md font-semibold text-on-surface">Pointage</h1>
          <p className="text-body-md text-on-surface-variant">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <span className="material-symbols-outlined text-[15px]">add</span>
          Nouveau pointage
        </button>
      </div>

      {/* Repeated lates alert */}
      {repeatedLates.length > 0 && (
        <div className="bg-warning-container border border-warning/30 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="material-symbols-outlined text-warning text-[20px] flex-shrink-0 mt-0.5">warning</span>
          <div>
            <p className="font-semibold text-on-surface text-body-lg">Retards récurrents détectés</p>
            <p className="text-body-md text-on-surface-variant mt-1">
              {repeatedLates.slice(0, 3).map((e: any) => `${e.firstName} ${e.lastName} (${e.lateCount} retards)`).join(' · ')}
              {repeatedLates.length > 3 && ` · et ${repeatedLates.length - 3} autre(s)`}
            </p>
          </div>
        </div>
      )}

      {/* Today stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Présents', value: stats.present, color: 'text-success', bg: 'bg-success-container', icon: 'check_circle' },
            { label: 'Absents', value: stats.absent, color: 'text-error', bg: 'bg-error-container', icon: 'cancel' },
            { label: 'En retard', value: stats.late, color: 'text-warning', bg: 'bg-warning-container', icon: 'schedule' },
            { label: 'Non pointés', value: stats.notRecorded, color: 'text-on-surface-variant', bg: 'bg-surface-variant', icon: 'help' },
            { label: 'Effectif total', value: stats.total, color: 'text-primary', bg: 'bg-primary/10', icon: 'groups' },
          ].map(s => (
            <div key={s.label} className="card flex items-center gap-3">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                <span className={`material-symbols-outlined ${s.color} text-[18px]`}>{s.icon}</span>
              </div>
              <div>
                <p className={`text-title-md font-semibold ${s.color}`}>{s.value}</p>
                <p className="text-body-md text-on-surface-variant">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-surface-variant p-0.5 rounded-lg">
          {[{ id: 'day', label: 'Jour' }, { id: 'week', label: 'Semaine' }, { id: 'month', label: 'Mois' }].map(p => (
            <button key={p.id} onClick={() => { setPeriod(period === p.id ? null : p.id); setDateFrom(''); setDateTo('') }}
              className={`px-3 py-1 rounded-md text-body-md font-medium transition-all ${period === p.id ? 'bg-white text-primary shadow-level-1' : 'text-on-surface-variant hover:text-on-surface'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <input type="date" className="input-field w-36" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPeriod(null) }} />
        <input type="date" className="input-field w-36" value={dateTo} onChange={e => { setDateTo(e.target.value); setPeriod(null) }} />
        <select className="input-field w-44" value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}>
          <option value="">Tous les employés</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
        </select>
        <select className="input-field w-40" value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
          <option value="">Tous départements</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="input-field w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Tous</option>
          <option value="present">Présents</option>
          <option value="absent">Absents</option>
        </select>
        <div className="ml-auto flex gap-1">
          <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-lg ${viewMode === 'table' ? 'bg-primary-container text-primary' : 'hover:bg-surface-variant text-on-surface-variant'}`}>
            <span className="material-symbols-outlined text-[16px]">table_rows</span>
          </button>
          <button onClick={() => setViewMode('cards')} className={`p-1.5 rounded-lg ${viewMode === 'cards' ? 'bg-primary-container text-primary' : 'hover:bg-surface-variant text-on-surface-variant'}`}>
            <span className="material-symbols-outlined text-[16px]">grid_view</span>
          </button>
        </div>
      </div>

      {/* Records — Table View */}
      {viewMode === 'table' ? (
        <div className="card p-0 overflow-hidden">
          <div className="px-3 py-2 border-b border-outline-variant flex items-center justify-between">
            <h3 className="font-semibold text-on-surface">Enregistrements ({records.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface border-b border-outline-variant">
                  {['Employé', 'Date', 'Entrée', 'Sortie', 'Heures', 'Heures sup.', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-label-md font-semibold text-on-surface-variant">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-outline-variant animate-pulse">
                      {Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-3 py-1.5"><div className="h-4 bg-surface-variant rounded" /></td>)}
                    </tr>
                  ))
                ) : records.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-on-surface-variant">Aucun enregistrement</td></tr>
                ) : (
                  records.map(r => {
                    const hours = r.checkIn && r.checkOut ? (() => {
                      const [h1, m1] = r.checkIn.split(':').map(Number)
                      const [h2, m2] = r.checkOut.split(':').map(Number)
                      const mins = (h2 * 60 + m2) - (h1 * 60 + m1)
                      return mins > 0 ? (mins / 60).toFixed(1) + 'h' : '—'
                    })() : '—'
                    return (
                      <tr key={r.id} className="border-b border-outline-variant hover:bg-surface/50 group">
                        <td className="px-3 py-1.5">
                          <p className="font-medium text-on-surface">{r.employee?.firstName} {r.employee?.lastName}</p>
                          <p className="text-body-md text-on-surface-variant">{r.employee?.department}</p>
                        </td>
                        <td className="px-3 py-1.5 text-on-surface-variant">{new Date(r.date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-3 py-1.5">{r.checkIn || '—'}</td>
                        <td className="px-3 py-1.5">{r.checkOut || '—'}</td>
                        <td className="px-3 py-1.5 text-on-surface-variant">{hours}</td>
                        <td className="px-3 py-1.5 text-on-surface-variant">{r.overtime ? `${r.overtime}h` : '—'}</td>
                        <td className="px-3 py-1.5">
                          {r.absence
                            ? <span className="badge-inactive">Absent</span>
                            : r.isLate
                              ? <span className="badge-pending">En retard</span>
                              : <span className="badge-active">Présent</span>}
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-surface-variant text-secondary hover:text-primary transition-colors">
                              <span className="material-symbols-outlined text-[15px]">edit</span>
                            </button>
                            <button onClick={() => setDeleteConfirm(r.id)} className="p-1.5 rounded-lg hover:bg-error-container text-secondary hover:text-error transition-colors">
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
      ) : (
        /* Cards View */
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 bg-surface-variant rounded-xl animate-pulse" />)
          ) : records.length === 0 ? (
            <div className="col-span-3 card text-center py-12 text-on-surface-variant">Aucun enregistrement</div>
          ) : (
            records.map(r => (
              <div key={r.id} className="card group">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-on-surface">{r.employee?.firstName} {r.employee?.lastName}</p>
                    <p className="text-caption text-on-surface-variant">{r.employee?.department}</p>
                  </div>
                  {r.absence
                    ? <span className="badge-inactive">Absent</span>
                    : r.isLate
                      ? <span className="badge-pending">En retard</span>
                      : <span className="badge-active">Présent</span>}
                </div>
                <p className="text-caption text-on-surface-variant">{new Date(r.date).toLocaleDateString('fr-FR')}</p>
                {!r.absence && <p className="text-body-md text-on-surface mt-1">{r.checkIn || '—'} → {r.checkOut || '—'}</p>}
                {r.overtime && <p className="text-caption text-on-surface-variant">+{r.overtime}h sup.</p>}
                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-surface-variant text-secondary hover:text-primary">
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                  </button>
                  <button onClick={() => setDeleteConfirm(r.id)} className="p-1.5 rounded-lg hover:bg-error-container text-secondary hover:text-error">
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-level-3 border border-outline-variant w-[440px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
              <h3 className="text-title-sm font-semibold text-on-surface">{editingId ? 'Modifier le pointage' : 'Nouveau pointage'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-full hover:bg-surface-container-high text-secondary">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="label">Employé *</label>
                <select className={ic} value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}>
                  <option value="">Sélectionner un employé</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.department}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date *</label>
                <input type="date" className={ic} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="absence" checked={form.absence} onChange={e => setForm(f => ({ ...f, absence: e.target.checked, checkIn: '', checkOut: '' }))} className="w-4 h-4 accent-primary" />
                <label htmlFor="absence" className="text-body-lg text-on-surface cursor-pointer">Absence</label>
              </div>
              {!form.absence && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Heure d&apos;entrée</label>
                    <input type="time" className={ic} value={form.checkIn} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Heure de sortie</label>
                    <input type="time" className={ic} value={form.checkOut} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))} />
                  </div>
                </div>
              )}
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

      {/* Delete confirm */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-surface p-5 rounded-xl shadow-level-3 border border-outline-variant w-80">
            <p className="text-body-lg font-medium mb-4">Supprimer ce pointage ?</p>
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
