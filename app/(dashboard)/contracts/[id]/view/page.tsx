'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import axios from 'axios'

const CONTRACT_TYPES: Record<string, string> = {
  CDI: 'Durée indéterminée (CDI)',
  CDD: 'Durée déterminée (CDD)',
  Stage: 'Stage',
  'Intérim': 'Intérim',
  Apprentissage: 'Apprentissage',
  Saisonnier: 'Saisonnier',
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ACTIVE:    { label: 'Actif',    cls: 'bg-primary/10 text-primary' },
  EXPIRED:   { label: 'Expiré',   cls: 'bg-error/10 text-error' },
  DRAFT:     { label: 'Brouillon', cls: 'bg-surface-container text-secondary border border-outline-variant' },
  CANCELLED: { label: 'Annulé',   cls: 'bg-error-container text-on-error-container' },
}

function fmt(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtMoney(v?: number | null, cur = 'XOF') {
  if (v == null) return '—'
  return `${cur} ${v.toLocaleString('fr-FR')}`
}

export default function ContractViewPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [contract, setContract] = useState<any>(null)
  const [companyName, setCompanyName] = useState('Entreprise')
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    Promise.all([
      axios.get(`/api/contracts/${id}`),
      axios.get('/api/settings?section=company'),
    ]).then(([cRes, sRes]) => {
      setContract(cRes.data)
      setCompanyName(sRes.data?.company_name || 'Entreprise')
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  function printContract() {
    if (!contract) return
    setPrinting(true)
    const emp = contract.Employee ?? {}
    const empName = emp.firstName ? `${emp.firstName} ${emp.lastName}` : '______'
    const total = (contract.salary || 0) + (contract.bonus || 0)
    const trialText = contract.trialEndDate
      ? `jusqu'au ${fmt(contract.trialEndDate)}`
      : 'Aucune période d\'essai'

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Contrat ${contract.contractNo}</title>
<style>
  body { font-family: Georgia, serif; padding: 50px 70px; font-size: 13px; line-height: 1.75; color: #1a1a1a; max-width: 820px; margin: 0 auto; }
  h1 { font-size: 18px; text-align: center; margin-bottom: 4px; }
  .subtitle { text-align: center; font-size: 12px; color: #555; margin-bottom: 32px; }
  h2 { font-size: 13px; font-weight: bold; margin-top: 22px; margin-bottom: 5px; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
  p { margin: 6px 0; }
  .sig { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 48px; }
  .sig div { border-top: 1px solid #333; padding-top: 8px; }
  @media print { body { padding: 20px 30px; } }
</style></head><body>
<h1>CONTRAT DE TRAVAIL</h1>
<div class="subtitle">${CONTRACT_TYPES[contract.type] ?? contract.type} &nbsp;·&nbsp; Réf. ${contract.contractNo}</div>

<p>Le présent Contrat de Travail <strong>(« Contrat »)</strong> est conclu et prend effet le <u>${fmt(contract.startDate)}</u>, entre :</p>
<p><strong>${companyName}</strong>, ci-après dénommé <strong>« l'Employeur »</strong> ;</p>
<p>et</p>
<p><strong>${empName}</strong>${emp.matricule ? ` (Matricule&nbsp;: ${emp.matricule})` : ''}, ci-après dénommé(e) <strong>« le Salarié »</strong> ;</p>
<p>Ci-après collectivement dénommés <strong>« les Parties »</strong>.</p>

<h2>Article 1 — Nature et Durée du Contrat</h2>
<p>Le présent contrat est un <strong>${CONTRACT_TYPES[contract.type] ?? contract.type}</strong>.</p>
<p>Date de début : <strong>${fmt(contract.startDate)}</strong>${contract.endDate ? ` — Date de fin : <strong>${fmt(contract.endDate)}</strong>` : ''}.</p>

<h2>Article 2 — Poste et Fonctions</h2>
<p>Le Salarié est engagé en qualité de <strong>${contract.position || '______'}</strong>${contract.department ? `, département <strong>${contract.department}</strong>` : ''}.</p>
${contract.workerCategory ? `<p>Catégorie professionnelle : <strong>${contract.workerCategory}</strong>.</p>` : ''}

<h2>Article 3 — Lieu de Travail</h2>
<p>Le lieu principal de travail est situé dans les locaux de l'Employeur.</p>

<h2>Article 4 — Rémunération</h2>
<p>Salaire de base brut : <strong>${fmtMoney(contract.salary, contract.currency ?? 'XOF')}</strong>, payable sur base ${(contract.payFrequency || 'mensuelle').toLowerCase()}.</p>
${contract.bonus ? `<p>Prime / Indemnités : <strong>${fmtMoney(contract.bonus, contract.currency ?? 'XOF')}</strong>.</p>` : ''}
<p>Rémunération brute totale : <strong>${fmtMoney(total, contract.currency ?? 'XOF')}</strong> par mois.</p>

<h2>Article 5 — Période d'Essai</h2>
<p>${trialText}.</p>

<h2>Article 6 — Heures de Travail</h2>
<p>${contract.workHours ? `${contract.workHours} heures par semaine` : 'Temps plein'}${contract.workDaysPerWeek ? ` sur ${contract.workDaysPerWeek} jours` : ''}.</p>

<h2>Article 7 — Congés Annuels</h2>
<p>${contract.annualLeaveDays ?? 21} jours ouvrables de congé payé par an.</p>

<h2>Article 8 — Confidentialité</h2>
<p>Le Salarié s'engage à maintenir la confidentialité des informations sensibles de l'Employeur pendant et après la durée du présent Contrat.</p>

<h2>Article 9 — Résiliation</h2>
<p>Le présent Contrat peut être résilié par l'une ou l'autre des Parties conformément aux dispositions du Code du Travail applicable.</p>

<h2>Article 10 — Droit Applicable</h2>
<p>Le présent Contrat est régi par et interprété conformément aux lois applicables.</p>

<p style="margin-top:36px">Fait en deux exemplaires originaux, à ____________, le ${fmt(contract.startDate)}.</p>
<div class="sig">
  <div><strong>Pour l'Employeur</strong><br><br><br>Signature : _______________<br><br>Nom et titre : _______________</div>
  <div><strong>Le Salarié</strong><br><br><br>Signature : _______________<br><br>Lu et approuvé</div>
</div>
</body></html>`

    const win = window.open('', '_blank', 'width=900,height=750')
    if (!win) { setPrinting(false); return }
    win.document.write(html)
    win.document.close()
    win.onload = () => { win.print(); setPrinting(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant">description_off</span>
        <p className="text-body-lg text-secondary">Contrat introuvable</p>
        <button onClick={() => router.push('/contracts')} className="btn-secondary">Retour</button>
      </div>
    )
  }

  const emp = contract.Employee ?? {}
  const status = STATUS_LABELS[contract.status] ?? { label: contract.status, cls: 'bg-surface-container text-secondary' }
  const total = (contract.salary || 0) + (contract.bonus || 0)

  return (
    <div className="max-w-4xl mx-auto space-y-4 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/contracts')}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] text-secondary">arrow_back</span>
          </button>
          <div>
            <h1 className="text-title-lg text-on-surface font-semibold">{contract.contractNo}</h1>
            <p className="text-caption text-secondary">{CONTRACT_TYPES[contract.type] ?? contract.type}</p>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium ${status.cls}`}>
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/contracts/${id}/edit`)}
            className="btn-secondary flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[15px]">edit</span>
            Modifier
          </button>
          <button
            onClick={printContract}
            disabled={printing}
            className="btn-primary flex items-center gap-1.5"
          >
            {printing
              ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <span className="material-symbols-outlined text-[15px]">print</span>
            }
            {printing ? 'Génération...' : 'Imprimer / PDF'}
          </button>
        </div>
      </div>

      {/* Employé */}
      <div className="bg-surface rounded-xl border border-outline-variant p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-semibold text-title-md flex-shrink-0">
          {emp.firstName?.[0]}{emp.lastName?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-title-sm font-semibold text-on-surface">{emp.firstName} {emp.lastName}</p>
          <p className="text-caption text-secondary">{emp.matricule} · {contract.position || '—'} · {contract.department || '—'}</p>
        </div>
        <button
          onClick={() => router.push(`/employees/${emp.id}`)}
          className="text-label-md text-primary hover:underline flex items-center gap-1"
        >
          Voir le dossier
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </button>
      </div>

      {/* Grille infos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dates */}
        <div className="bg-surface rounded-xl border border-outline-variant p-4 space-y-3">
          <h2 className="text-label-lg font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">calendar_today</span>
            Dates
          </h2>
          <Row label="Début" value={fmt(contract.startDate)} />
          <Row label="Fin" value={fmt(contract.endDate)} />
          <Row label="Fin période d'essai" value={fmt(contract.trialEndDate)} />
          <Row label="Créé le" value={fmt(contract.createdAt)} />
        </div>

        {/* Rémunération */}
        <div className="bg-surface rounded-xl border border-outline-variant p-4 space-y-3">
          <h2 className="text-label-lg font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">payments</span>
            Rémunération
          </h2>
          <Row label="Salaire de base" value={fmtMoney(contract.salary, contract.currency)} />
          <Row label="Prime / Indemnités" value={fmtMoney(contract.bonus, contract.currency)} />
          <Row label="Brut total" value={<span className="font-semibold text-primary">{fmtMoney(total, contract.currency)}</span>} />
          <Row label="Fréquence de paie" value={contract.payFrequency || '—'} />
        </div>

        {/* Conditions */}
        <div className="bg-surface rounded-xl border border-outline-variant p-4 space-y-3">
          <h2 className="text-label-lg font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">work</span>
            Conditions de travail
          </h2>
          <Row label="Type de contrat" value={CONTRACT_TYPES[contract.type] ?? contract.type} />
          <Row label="Horaire" value={contract.workHours ? `${contract.workHours}h/semaine` : '—'} />
          <Row label="Jours/semaine" value={contract.workDaysPerWeek ? `${contract.workDaysPerWeek} jours` : '—'} />
          <Row label="Congés annuels" value={contract.annualLeaveDays ? `${contract.annualLeaveDays} jours` : '—'} />
        </div>

        {/* Divers */}
        <div className="bg-surface rounded-xl border border-outline-variant p-4 space-y-3">
          <h2 className="text-label-lg font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">info</span>
            Informations complémentaires
          </h2>
          <Row label="Catégorie" value={contract.workerCategory || '—'} />
          <Row label="Devise" value={contract.currency || 'XOF'} />
          <Row label="Langue du contrat" value={contract.language || '—'} />
          <Row label="Employeur" value={companyName} />
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-caption text-secondary flex-shrink-0">{label}</span>
      <span className="text-body-md text-on-surface text-right">{value}</span>
    </div>
  )
}
