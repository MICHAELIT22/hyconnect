'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

interface RegisterEntry {
  id: number
  matricule: string
  lastName: string
  firstName: string
  sex: string
  nationality: string
  birthDate: string
  hireDate: string
  position: string
  department: string
  service: string
  status: string
  contractType: string
  contractEndDate: string | null
}

export default function RegisterPage() {
  const [entries, setEntries] = useState<RegisterEntry[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/register').then(r => setEntries(r.data)).finally(() => setLoading(false))
  }, [])

  const filtered = entries.filter(e =>
    !search || `${e.firstName} ${e.lastName} ${e.matricule}`.toLowerCase().includes(search.toLowerCase())
  )

  function exportCSV() {
    const headers = ['Matricule', 'Nom', 'Prénom', 'Sexe', 'Nationalité', 'Date Naissance', "Date d'embauche", 'Poste', 'Département', 'Service', 'Type contrat', 'Fin contrat', 'Statut']
    const rows = filtered.map(e => [
      e.matricule, e.lastName, e.firstName, e.sex, e.nationality,
      new Date(e.birthDate).toLocaleDateString('fr-FR'),
      new Date(e.hireDate).toLocaleDateString('fr-FR'),
      e.position, e.department, e.service, e.contractType,
      e.contractEndDate ? new Date(e.contractEndDate).toLocaleDateString('fr-FR') : '',
      e.status,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'registre-personnel.csv'; a.click()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-md font-semibold text-on-surface">Registre du personnel</h1>
          <p className="text-body-md text-on-surface-variant">{filtered.length} employé(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="btn-secondary">
            <span className="material-symbols-outlined text-[15px]">print</span>
            Imprimer
          </button>
          <button onClick={exportCSV} className="btn-secondary">
            <span className="material-symbols-outlined text-[15px]">download</span>
            Exporter CSV
          </button>
        </div>
      </div>

      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">search</span>
        <input className="input-field pl-10 w-full max-w-sm" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant bg-surface">
                {['Matricule', 'Nom', 'Prénom', 'Sexe', 'Nationalité', 'Naissance', 'Embauche', 'Poste', 'Département', 'Service', 'Contrat', 'Fin contrat', 'Statut'].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-label-md font-semibold text-on-surface-variant whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-outline-variant animate-pulse">
                    {Array.from({ length: 13 }).map((_, j) => (
                      <td key={j} className="px-3 py-2"><div className="h-3 bg-surface-variant rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.map(e => (
                <tr key={e.id} className="border-b border-outline-variant hover:bg-surface/50">
                  <td className="px-3 py-2 font-mono">{e.matricule}</td>
                  <td className="px-3 py-2 font-medium">{e.lastName}</td>
                  <td className="px-3 py-2">{e.firstName}</td>
                  <td className="px-3 py-2">{e.sex}</td>
                  <td className="px-3 py-2">{e.nationality}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(e.birthDate).toLocaleDateString('fr-FR')}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(e.hireDate).toLocaleDateString('fr-FR')}</td>
                  <td className="px-3 py-2">{e.position}</td>
                  <td className="px-3 py-2">{e.department}</td>
                  <td className="px-3 py-2">{e.service}</td>
                  <td className="px-3 py-2"><span className="bg-secondary-container px-2 py-0.5 rounded-full">{e.contractType}</span></td>
                  <td className="px-3 py-2 whitespace-nowrap">{e.contractEndDate ? new Date(e.contractEndDate).toLocaleDateString('fr-FR') : 'CDI'}</td>
                  <td className="px-3 py-2">
                    <span className={e.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
