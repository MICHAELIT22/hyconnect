'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import useSWR from 'swr'
import EmployeeForm from '@/components/employees/EmployeeForm'

interface Employee {
  id: number
  matricule: string
  firstName: string
  lastName: string
  email: string
  phone1: string
  position: string
  department: string
  status: string
  sex: string
  birthDate: string
  hireDate: string
  photoPath: string | null
  contracts: { type: string }[]
}

function KpiCard({ label, value, icon, colorClass = 'text-on-surface-variant', bgClass = 'bg-surface-variant' }: {
  label: string; value: number; icon: string; colorClass?: string; bgClass?: string
}) {
  return (
    <div className="card flex flex-col items-center justify-center text-center gap-1 py-2">
      <div className={`w-8 h-8 ${bgClass} rounded-xl flex items-center justify-center`}>
        <span className={`material-symbols-outlined ${colorClass} text-[15px]`}>{icon}</span>
      </div>
      <p className={`text-title-sm font-semibold ${colorClass}`}>{value}</p>
      <p className="text-caption text-on-surface-variant leading-tight">{label}</p>
    </div>
  )
}

function Badge({ label, variant }: { label: string; variant: 'primary' | 'tertiary' | 'warning' | 'error' | 'outline' }) {
  const cls = {
    primary: 'bg-primary/10 text-primary',
    tertiary: 'bg-tertiary/10 text-tertiary',
    warning: 'bg-warning-container text-warning',
    error: 'bg-error-container text-error',
    outline: 'bg-surface-container text-secondary border border-outline-variant',
  }[variant]
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-caption font-medium ${cls}`}>{label}</span>
}

const getAge = (birthDate: string) => {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const getSeniority = (hireDate: string) => {
  const now = new Date()
  const hire = new Date(hireDate)
  let years = now.getFullYear() - hire.getFullYear()
  let months = now.getMonth() - hire.getMonth()
  if (now.getDate() < hire.getDate()) months--
  if (months < 0) { years--; months += 12 }
  if (years === 0) return `${months} mois`
  return `${years} an${years > 1 ? 's' : ''} ${months} mois`
}

export default function EmployeesPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [massDeleteConfirm, setMassDeleteConfirm] = useState(false)
  const [filters, setFilters] = useState({ department: '', contractType: '', status: '', sex: '' })
  const [showForm, setShowForm] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)

  const { data: employees = [], isLoading: loading, mutate: mutateEmployees } = useSWR<Employee[]>('/api/employees?limit=500')
  const fetchEmployees = () => mutateEmployees()

  const filtered = useMemo(() => {
    return employees.filter(emp => {
      const q = search.toLowerCase()
      const matchesSearch = !q ||
        emp.firstName.toLowerCase().includes(q) ||
        emp.lastName.toLowerCase().includes(q) ||
        emp.matricule.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.phone1?.toLowerCase().includes(q) ||
        emp.position.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q)
      const matchesDept = !filters.department || emp.department === filters.department
      const matchesContract = !filters.contractType || emp.contracts?.[0]?.type === filters.contractType
      const matchesStatus = !filters.status || emp.status === filters.status
      const matchesSex = !filters.sex || emp.sex === filters.sex
      return matchesSearch && matchesDept && matchesContract && matchesStatus && matchesSex
    })
  }, [employees, search, filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const start = (currentPage - 1) * rowsPerPage
  const paginated = filtered.slice(start, start + rowsPerPage)

  const activeCount = employees.filter(e => e.status === 'ACTIVE').length
  const leaveCount = employees.filter(e => e.status === 'LEAVE').length
  const departedCount = employees.filter(e => e.status !== 'ACTIVE' && e.status !== 'LEAVE').length

  const departments = [...new Set(employees.map(e => e.department))].sort()
  const contractTypes = [...new Set(employees.flatMap(e => e.contracts.map(c => c.type)))].sort()

  const toggleSelect = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === paginated.length ? [] : paginated.map(e => e.id))

  const handleDelete = async () => {
    if (deleteConfirm === null) return
    await axios.delete(`/api/employees/${deleteConfirm}`)
    setDeleteConfirm(null)
    fetchEmployees()
  }

  const handleMassDelete = async () => {
    for (const id of selectedIds) await axios.delete(`/api/employees/${id}`)
    setSelectedIds([])
    setMassDeleteConfirm(false)
    fetchEmployees()
  }

  function exportCSV() {
    const headers = ['Matricule', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Poste', 'Département', 'Statut', 'Type contrat', 'Âge', 'Ancienneté']
    const rows = filtered.map(e => [
      e.matricule, e.firstName, e.lastName, e.email, e.phone1,
      e.position, e.department, e.status,
      e.contracts?.[0]?.type || '',
      e.birthDate ? getAge(e.birthDate) : '',
      e.hireDate ? getSeniority(e.hireDate) : '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'employes.csv'; a.click()
  }

  if (loading) return <div className="p-4 text-secondary text-body-md">Chargement...</div>

  return (
    <div>
      {/* KPI */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Effectif total" value={employees.length} icon="groups" colorClass="text-primary" bgClass="bg-primary/10" />
        <KpiCard label="Actifs" value={activeCount} icon="how_to_reg" colorClass="text-tertiary" bgClass="bg-tertiary-container" />
        <KpiCard label="En congé" value={leaveCount} icon="event_busy" colorClass="text-warning" bgClass="bg-warning-container" />
        <KpiCard label="Sortis" value={departedCount} icon="person_remove" colorClass="text-error" bgClass="bg-error-container" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-headline-md font-semibold text-on-surface">Employés</h2>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">
            <span className="material-symbols-outlined text-[15px]">upload</span>
            Importer
          </button>
          <button onClick={exportCSV} className="btn-secondary">
            <span className="material-symbols-outlined text-[15px]">download</span>
            Exporter
          </button>
          <button
            onClick={() => { setEditEmployee(null); setShowForm(true) }}
            className="btn-primary"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            Ajouter
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-level-1 overflow-hidden">
        {/* Filters */}
        <div className="p-3 border-b border-outline-variant bg-surface-container-lowest flex flex-wrap gap-3 items-center">
          <div className="relative w-56">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-[13px]">search</span>
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full pl-7 pr-2 py-1 bg-surface border border-outline-variant rounded text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
            />
          </div>
          <select
            value={filters.department}
            onChange={e => { setFilters({ ...filters, department: e.target.value }); setCurrentPage(1) }}
            className="border border-outline-variant rounded text-body-md bg-surface-container py-1 px-2"
          >
            <option value="">Tous les départements</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            value={filters.contractType}
            onChange={e => { setFilters({ ...filters, contractType: e.target.value }); setCurrentPage(1) }}
            className="border border-outline-variant rounded text-body-md bg-surface-container py-1 px-2"
          >
            <option value="">Tous les contrats</option>
            {contractTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filters.status}
            onChange={e => { setFilters({ ...filters, status: e.target.value }); setCurrentPage(1) }}
            className="border border-outline-variant rounded text-body-md bg-surface-container py-1 px-2"
          >
            <option value="">Tous les statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="LEAVE">En congé</option>
            <option value="INACTIVE">Sorti</option>
          </select>
          <select
            value={filters.sex}
            onChange={e => { setFilters({ ...filters, sex: e.target.value }); setCurrentPage(1) }}
            className="border border-outline-variant rounded text-body-md bg-surface-container py-1 px-2"
          >
            <option value="">Sexe</option>
            <option value="M">Homme</option>
            <option value="F">Femme</option>
          </select>
          {selectedIds.length > 0 && (
            <button
              onClick={() => setMassDeleteConfirm(true)}
              className="ml-auto text-error text-label-md flex items-center gap-1.5 hover:underline"
            >
              <span className="material-symbols-outlined text-[15px]">delete</span>
              Supprimer ({selectedIds.length})
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-variant border-b border-outline-variant">
              <tr>
                <th className="px-3 py-2 w-10">
                  <input type="checkbox" checked={selectedIds.length === paginated.length && paginated.length > 0} onChange={toggleSelectAll} />
                </th>
                <th className="px-3 py-2 text-label-md text-on-surface-variant uppercase">Employé</th>
                <th className="px-3 py-2 text-label-md text-on-surface-variant uppercase">Matricule</th>
                <th className="px-3 py-2 text-label-md text-on-surface-variant uppercase">Poste</th>
                <th className="px-3 py-2 text-label-md text-on-surface-variant uppercase">Département</th>
                <th className="px-3 py-2 text-label-md text-on-surface-variant uppercase">Contrat</th>
                <th className="px-3 py-2 text-label-md text-on-surface-variant uppercase">Ancienneté</th>
                <th className="px-3 py-2 text-label-md text-on-surface-variant uppercase">Âge</th>
                <th className="px-3 py-2 text-label-md text-on-surface-variant uppercase">Statut</th>
                <th className="px-3 py-2 text-label-md text-on-surface-variant uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-surface">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-secondary text-body-md">
                    Aucun employé trouvé
                  </td>
                </tr>
              ) : (
                paginated.map(emp => {
                  const contractType = emp.contracts?.[0]?.type
                  return (
                    <tr key={emp.id} className="hover:bg-surface-container-low transition-colors group h-10">
                      <td className="px-3 py-1.5">
                        <input type="checkbox" checked={selectedIds.includes(emp.id)} onChange={() => toggleSelect(emp.id)} />
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="relative h-7 w-7 shrink-0">
                            {emp.photoPath ? (
                              <img src={emp.photoPath} alt="" className="h-7 w-7 rounded-full object-cover border border-outline-variant" />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-md font-bold border border-outline-variant">
                                {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                              </div>
                            )}
                            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                              emp.status === 'ACTIVE' ? 'bg-tertiary' : emp.status === 'LEAVE' ? 'bg-warning' : 'bg-error'
                            }`} />
                          </div>
                          <div>
                            <div className="text-body-md text-on-surface font-medium">{emp.firstName} {emp.lastName}</div>
                            <div className="text-caption text-secondary">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-body-md text-secondary">{emp.matricule}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-body-md text-on-surface">{emp.position}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-body-md text-on-surface">{emp.department}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {contractType ? (
                          <Badge
                            label={contractType}
                            variant={contractType === 'CDI' ? 'primary' : contractType === 'CDD' ? 'tertiary' : 'outline'}
                          />
                        ) : <span className="text-caption text-secondary">—</span>}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-body-md text-on-surface">{getSeniority(emp.hireDate)}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-body-md text-on-surface">{getAge(emp.birthDate)} ans</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <Badge
                          label={emp.status === 'ACTIVE' ? 'Actif' : emp.status === 'LEAVE' ? 'Congé' : 'Sorti'}
                          variant={emp.status === 'ACTIVE' ? 'tertiary' : emp.status === 'LEAVE' ? 'warning' : 'error'}
                        />
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => router.push(`/employees/${emp.id}`)} className="text-secondary hover:text-primary p-0.5 rounded hover:bg-surface-variant transition-colors" title="Voir">
                            <span className="material-symbols-outlined text-[13px]">visibility</span>
                          </button>
                          <button onClick={() => router.push(`/employees/${emp.id}?edit=true`)} className="text-secondary hover:text-primary p-0.5 rounded hover:bg-surface-variant transition-colors" title="Modifier">
                            <span className="material-symbols-outlined text-[13px]">edit</span>
                          </button>
                          <button onClick={() => setDeleteConfirm(emp.id)} className="text-secondary hover:text-error p-0.5 rounded hover:bg-surface-variant transition-colors" title="Supprimer">
                            <span className="material-symbols-outlined text-[13px]">delete</span>
                          </button>
                          <button onClick={() => router.push(`/employees/${emp.id}?tab=contracts`)} className="text-secondary hover:text-primary p-0.5 rounded hover:bg-surface-variant transition-colors" title="Contrats">
                            <span className="material-symbols-outlined text-[13px]">description</span>
                          </button>
                          <button onClick={() => router.push(`/employees/${emp.id}?tab=leaves`)} className="text-secondary hover:text-primary p-0.5 rounded hover:bg-surface-variant transition-colors" title="Congés">
                            <span className="material-symbols-outlined text-[13px]">event_busy</span>
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
        <div className="bg-surface px-3 py-2 border-t border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-body-md text-secondary">
              {filtered.length === 0 ? 'Aucun résultat' : `${start + 1}–${Math.min(start + rowsPerPage, filtered.length)} sur ${filtered.length}`}
            </span>
            <select
              value={rowsPerPage}
              onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1) }}
              className="border border-outline-variant rounded text-body-md bg-surface-container py-0.5 px-1"
            >
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-body-md text-secondary">Page {currentPage} sur {totalPages}</span>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1 rounded border border-outline-variant text-secondary hover:bg-surface-container-low disabled:opacity-50">
              <span className="material-symbols-outlined text-[15px]">chevron_left</span>
            </button>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1 rounded border border-outline-variant text-secondary hover:bg-surface-container-low disabled:opacity-50">
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Employee form modal */}
      {showForm && (
        <EmployeeForm
          employee={editEmployee}
          onClose={() => { setShowForm(false); setEditEmployee(null) }}
          onSuccess={fetchEmployees}
        />
      )}

      {/* Confirm delete single */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-surface p-5 rounded-xl shadow-level-3 border border-outline-variant w-80">
            <p className="text-body-md mb-4">Confirmer la suppression de cet employé ?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 border border-outline text-secondary rounded-lg text-label-md hover:bg-surface-container-low">Annuler</button>
              <button onClick={handleDelete} className="px-3 py-1.5 bg-error text-on-error rounded-lg text-label-md hover:opacity-90">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm mass delete */}
      {massDeleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-surface p-5 rounded-xl shadow-level-3 border border-outline-variant w-80">
            <p className="text-body-md mb-4">Supprimer {selectedIds.length} employé(s) sélectionné(s) ?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setMassDeleteConfirm(false)} className="px-3 py-1.5 border border-outline text-secondary rounded-lg text-label-md hover:bg-surface-container-low">Annuler</button>
              <button onClick={handleMassDelete} className="px-3 py-1.5 bg-error text-on-error rounded-lg text-label-md hover:opacity-90">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
