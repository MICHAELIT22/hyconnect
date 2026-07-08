'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'

interface Entry {
  id: number
  employeeId: number
  matricule: string
  firstName: string
  lastName: string
  department: string
  position: string
  base: number
  transport: number
  housing: number
  positionAllowance: number
  gross: number
  cnss: number
  tax: number
  net: number
}

interface Cycle {
  id: number
  month: number
  year: number
  status: 'DRAFT' | 'PROCESSED' | 'PAID'
  totalGross: number
  totalCnss: number
  totalTax: number
  totalNet: number
  createdAt: string
  entries: Entry[]
}

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const STATUS_NEXT: Record<string, { label: string; next: string; icon: string }> = {
  DRAFT: { label: 'Marquer comme traité', next: 'PROCESSED', icon: 'check_circle' },
  PROCESSED: { label: 'Marquer comme payé', next: 'PAID', icon: 'payments' },
  PAID: { label: 'Cycle clôturé', next: '', icon: 'lock' },
}
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-surface-container text-secondary border border-outline-variant',
  PROCESSED: 'bg-primary/10 text-primary',
  PAID: 'bg-tertiary/10 text-tertiary',
}
const STATUS_LABELS: Record<string, string> = { DRAFT: 'Brouillon', PROCESSED: 'Traité', PAID: 'Payé' }

export default function PayrollCyclePage() {
  const { id } = useParams()
  const router = useRouter()
  const [cycle, setCycle] = useState<Cycle | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('')
  const [updating, setUpdating] = useState(false)

  const load = () => {
    setLoading(true)
    axios.get(`/api/payroll/cycles/${id}`).then(r => setCycle(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const fmt = (n: number) => n.toLocaleString('fr-FR')

  const updateStatus = async (next: string) => {
    if (!next) return
    setUpdating(true)
    try {
      await axios.patch(`/api/payroll/cycles/${id}`, { status: next })
      load()
    } finally {
      setUpdating(false)
    }
  }

  function generatePayslip(e: Entry) {
    const win = window.open('', '_blank', 'width=800,height=600')
    if (!win || !cycle) return
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bulletin de Paie</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0 }
  body { font-family: Arial, sans-serif; padding: 30px; font-size: 11px; color: #333 }
  h1 { font-size: 15px; font-weight: bold; text-align: center; margin-bottom: 4px }
  .subtitle { text-align: center; color: #666; margin-bottom: 20px; font-size: 10px }
  .info { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 18px; border: 1px solid #ddd; padding: 12px; border-radius: 6px }
  .info-item { display: flex; gap: 4px }
  .info-label { color: #666 }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px }
  th { background: #f5f5f5; font-weight: 600; text-align: left; padding: 7px 10px; border: 1px solid #ddd; font-size: 10px; text-transform: uppercase }
  td { padding: 7px 10px; border: 1px solid #ddd }
  .amount { text-align: right; font-family: monospace }
  .total-row { background: #e8f5e9; font-weight: bold }
  .deduct-row { background: #fff3e0 }
  .footer { margin-top: 30px; text-align: center; color: #999; font-size: 9px }
</style></head><body>
<h1>BULLETIN DE PAIE</h1>
<p class="subtitle">${MONTHS_FR[cycle.month - 1]} ${cycle.year}</p>
<div class="info">
  <div class="info-item"><span class="info-label">Nom :</span> <strong>${e.firstName} ${e.lastName}</strong></div>
  <div class="info-item"><span class="info-label">Matricule :</span> ${e.matricule}</div>
  <div class="info-item"><span class="info-label">Poste :</span> ${e.position}</div>
  <div class="info-item"><span class="info-label">Département :</span> ${e.department}</div>
</div>
<table>
  <tr><th>Rubrique</th><th class="amount">Base</th><th class="amount">Montant (FCFA)</th></tr>
  <tr><td>Salaire de base</td><td class="amount">—</td><td class="amount">${fmt(e.base)}</td></tr>
  ${e.transport > 0 ? `<tr><td>Prime de transport</td><td class="amount">—</td><td class="amount">${fmt(e.transport)}</td></tr>` : ''}
  ${e.housing > 0 ? `<tr><td>Prime de logement</td><td class="amount">—</td><td class="amount">${fmt(e.housing)}</td></tr>` : ''}
  ${e.positionAllowance > 0 ? `<tr><td>Prime de fonction</td><td class="amount">—</td><td class="amount">${fmt(e.positionAllowance)}</td></tr>` : ''}
  <tr class="total-row"><td><strong>Salaire brut</strong></td><td></td><td class="amount"><strong>${fmt(e.gross)}</strong></td></tr>
  <tr class="deduct-row"><td>— Cotisation CNSS (3.2%)</td><td class="amount">${fmt(e.gross)}</td><td class="amount">— ${fmt(e.cnss)}</td></tr>
  <tr class="deduct-row"><td>— Impôts sur salaires</td><td class="amount">${fmt(e.gross - e.cnss)}</td><td class="amount">— ${fmt(e.tax)}</td></tr>
  <tr class="total-row"><td colspan="2"><strong>NET À PAYER</strong></td><td class="amount"><strong>${fmt(e.net)}</strong></td></tr>
</table>
<div class="footer">Document généré automatiquement — ${MONTHS_FR[cycle.month - 1]} ${cycle.year}</div>
<script>window.onload=function(){window.print();window.close()}</script>
</body></html>`
    win.document.write(html)
    win.document.close()
  }

  function exportCSV() {
    if (!cycle) return
    const headers = ['Matricule', 'Prénom', 'Nom', 'Département', 'Poste', 'Base', 'Transport', 'Logement', 'Prime', 'Brut', 'CNSS', 'Impôts', 'Net']
    const rows = cycle.entries.map(e => [
      e.matricule, e.firstName, e.lastName, e.department, e.position,
      e.base, e.transport, e.housing, e.positionAllowance, e.gross, e.cnss, e.tax, e.net,
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `paie_${MONTHS_FR[cycle.month - 1]}_${cycle.year}.csv`
    a.click()
  }

  if (loading) return (
    <div className="space-y-3 animate-pulse">
      <div className="h-12 bg-surface-variant rounded-xl" />
      <div className="h-24 bg-surface-variant rounded-xl" />
      <div className="h-64 bg-surface-variant rounded-xl" />
    </div>
  )

  if (!cycle) return (
    <div className="text-center py-12">
      <p className="text-on-surface-variant">Cycle non trouvé</p>
      <button onClick={() => router.back()} className="btn-primary mt-4">Retour</button>
    </div>
  )

  const depts = [...new Set(cycle.entries.map(e => e.department).filter(Boolean))].sort()
  const filtered = cycle.entries.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${e.firstName} ${e.lastName} ${e.matricule}`.toLowerCase().includes(q)
    const matchDept = !dept || e.department === dept
    return matchSearch && matchDept
  })

  const nextStatus = STATUS_NEXT[cycle.status]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/payroll')} className="p-1.5 rounded-lg hover:bg-surface-variant text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-headline-md font-semibold text-on-surface capitalize">
              {MONTHS_FR[cycle.month - 1]} {cycle.year}
            </h1>
            <span className={`text-caption px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[cycle.status]}`}>
              {STATUS_LABELS[cycle.status]}
            </span>
          </div>
          <p className="text-body-md text-on-surface-variant">{cycle.entries.length} employé{cycle.entries.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary">
            <span className="material-symbols-outlined text-[13px]">download</span>
            Exporter CSV
          </button>
          {nextStatus.next && (
            <button
              onClick={() => updateStatus(nextStatus.next)}
              disabled={updating}
              className="btn-primary"
            >
              <span className="material-symbols-outlined text-[13px]">{nextStatus.icon}</span>
              {updating ? '...' : nextStatus.label}
            </button>
          )}
          {!nextStatus.next && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tertiary/10 text-tertiary text-label-md">
              <span className="material-symbols-outlined text-[13px]">lock</span>
              Cycle clôturé
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Masse salariale brute', value: fmt(cycle.totalGross) + ' FCFA', color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
          { label: 'Cotisations CNSS', value: fmt(cycle.totalCnss) + ' FCFA', color: 'text-warning', bg: 'bg-warning/5 border-warning/20' },
          { label: 'Impôts sur salaires', value: fmt(cycle.totalTax) + ' FCFA', color: 'text-error', bg: 'bg-error/5 border-error/20' },
          { label: 'Masse salariale nette', value: fmt(cycle.totalNet) + ' FCFA', color: 'text-tertiary', bg: 'bg-tertiary/5 border-tertiary/20' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.bg}`}>
            <p className="text-caption text-on-surface-variant">{kpi.label}</p>
            <p className={`text-title-sm font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
        {/* Filters */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant">
          <div className="relative flex-1 max-w-xs">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un employé..."
              className="w-full pl-8 pr-3 py-1.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={dept}
            onChange={e => setDept(e.target.value)}
            className="border border-outline-variant rounded-lg text-body-md bg-surface py-1.5 px-2"
          >
            <option value="">Tous les départements</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <span className="text-caption text-secondary ml-auto">{filtered.length} employé{filtered.length !== 1 ? 's' : ''}</span>
          <button
            onClick={() => { if (cycle) { cycle.entries.forEach(e => { generatePayslip(e) }) } }}
            className="btn-secondary"
          >
            <span className="material-symbols-outlined text-[13px]">receipt_long</span>
            Tous les bulletins
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-outline-variant">
                <th className="px-4 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase">Employé</th>
                <th className="px-4 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase text-right">Base</th>
                <th className="px-4 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase text-right">Indemnités</th>
                <th className="px-4 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase text-right">Brut</th>
                <th className="px-4 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase text-right">CNSS</th>
                <th className="px-4 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase text-right">Impôts</th>
                <th className="px-4 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase text-right">Net</th>
                <th className="px-4 py-2.5 text-label-md font-semibold text-on-surface-variant uppercase text-right">Bulletin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-on-surface-variant text-body-md">
                    Aucun employé trouvé
                  </td>
                </tr>
              ) : (
                filtered.map(e => (
                  <tr key={e.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="text-body-md font-medium text-on-surface">{e.firstName} {e.lastName}</p>
                      <p className="text-caption text-secondary">{e.department} · {e.matricule}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right text-body-md text-on-surface-variant">{fmt(e.base)}</td>
                    <td className="px-4 py-2.5 text-right text-body-md text-on-surface-variant">
                      {fmt(e.transport + e.housing + e.positionAllowance)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-body-md font-medium text-on-surface">{fmt(e.gross)}</td>
                    <td className="px-4 py-2.5 text-right text-body-md text-warning">{fmt(e.cnss)}</td>
                    <td className="px-4 py-2.5 text-right text-body-md text-error">{fmt(e.tax)}</td>
                    <td className="px-4 py-2.5 text-right text-body-md font-bold text-tertiary">{fmt(e.net)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => generatePayslip(e)}
                        className="p-1 rounded hover:bg-surface-variant text-secondary hover:text-primary transition-colors"
                        title="Générer le bulletin"
                      >
                        <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-surface-container-lowest border-t-2 border-outline-variant">
                  <td className="px-4 py-2.5 text-body-md font-semibold text-on-surface">Total</td>
                  <td className="px-4 py-2.5 text-right text-body-md font-semibold">{fmt(filtered.reduce((a, e) => a + e.base, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-body-md font-semibold">{fmt(filtered.reduce((a, e) => a + e.transport + e.housing + e.positionAllowance, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-body-md font-semibold">{fmt(filtered.reduce((a, e) => a + e.gross, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-body-md font-semibold text-warning">{fmt(filtered.reduce((a, e) => a + e.cnss, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-body-md font-semibold text-error">{fmt(filtered.reduce((a, e) => a + e.tax, 0))}</td>
                  <td className="px-4 py-2.5 text-right text-body-md font-bold text-tertiary">{fmt(filtered.reduce((a, e) => a + e.net, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
