'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'

interface Employee {
  id: number
  firstName: string
  lastName: string
  matricule: string
  position?: string
  department?: string
  baseSalary?: number
}

const CONTRACT_TYPES = [
  { value: 'CDI', label: 'Durée indéterminée (CDI)' },
  { value: 'CDD', label: 'Durée déterminée (CDD)' },
  { value: 'Stage', label: 'Stage' },
  { value: 'Intérim', label: 'Intérim' },
  { value: 'Apprentissage', label: 'Apprentissage' },
  { value: 'Saisonnier', label: 'Saisonnier' },
]

const TRIAL_PERIODS = [
  { value: '', label: 'Aucune' },
  { value: '30', label: '30 jours (1 mois)' },
  { value: '60', label: '60 jours (2 mois)' },
  { value: '90', label: '90 jours (3 mois)' },
  { value: '180', label: '180 jours (6 mois)' },
]

const SCHEDULE_TYPES = [
  { value: 'Temps plein', label: 'Temps plein' },
  { value: 'Temps partiel', label: 'Temps partiel' },
  { value: 'Flexible', label: 'Flexible' },
]

const CURRENCIES = ['XOF', 'FCFA', 'EUR', 'USD']
const PAY_FREQUENCIES = ['Mensuel', 'Bimensuel', 'Hebdomadaire']
const LANGUAGES = ['Français', 'Anglais']

const CLAUSE_TEMPLATES = [
  { label: 'Confidentialité', text: 'Le Salarié s\'engage à maintenir strictement confidentielle toute information relative à l\'Employeur, ses clients, ses procédés et ses affaires.' },
  { label: 'Non-concurrence', text: 'Le Salarié s\'interdit, pendant la durée du contrat et pour une période de 12 mois après sa cessation, d\'exercer toute activité concurrente directe ou indirecte.' },
  { label: 'Dédit-formation', text: 'En cas de rupture du contrat à l\'initiative du Salarié dans les 24 mois suivant la fin d\'une formation prise en charge par l\'Employeur, le Salarié s\'engage à rembourser les frais engagés.' },
  { label: 'Exclusivité', text: 'Le Salarié consacre l\'intégralité de son activité professionnelle à l\'Employeur et s\'engage à ne pas exercer d\'autre activité rémunérée sans autorisation écrite préalable.' },
]

const FIELD_TEMPLATES = [
  { label: 'Nom du salarié', value: '{{employeeName}}' },
  { label: 'Matricule', value: '{{matricule}}' },
  { label: 'Poste', value: '{{position}}' },
  { label: 'Département', value: '{{department}}' },
  { label: 'Salaire brut', value: '{{salary}}' },
  { label: 'Date de début', value: '{{startDate}}' },
  { label: 'Date de fin', value: '{{endDate}}' },
  { label: 'Période d\'essai', value: '{{trialPeriod}}' },
]

const emptyForm = {
  employeeId: '',
  type: 'CDI',
  position: '',
  department: '',
  salary: '',
  bonus: '',
  startDate: '',
  endDate: '',
  trialDays: '',
  workSchedule: 'Temps plein',
  workHours: '40',
  workDaysPerWeek: '5',
  annualLeaveDays: '21',
  currency: 'XOF',
  payFrequency: 'Mensuel',
  language: 'Français',
  workerCategory: '',
  status: 'ACTIVE',
  customClauses: [] as string[],
}

function computeTrialEndDate(startDate: string, trialDays: string): string {
  if (!startDate || !trialDays) return ''
  const d = new Date(startDate)
  d.setDate(d.getDate() + parseInt(trialDays))
  return d.toISOString().split('T')[0]
}

function buildContractHTML(form: typeof emptyForm, emp: Employee | null): string {
  const empName = emp ? `${emp.firstName} ${emp.lastName}` : '______'
  const trialEnd = computeTrialEndDate(form.startDate, form.trialDays)
  const trialText = form.trialDays ? `${form.trialDays} jours (${parseInt(form.trialDays) / 30} mois)` : 'Aucune'
  const totalGross = (parseFloat(form.salary) || 0) + (parseFloat(form.bonus) || 0)

  const clauses = form.customClauses.map((clause, i) =>
    `<h2>Article ${11 + i} — Clause particulière</h2><p>${clause}</p>`
  ).join('')

  return `
<p>Le présent Contrat de Travail <strong>(« Contrat »)</strong> est conclu et prend effet le <u>${form.startDate ? new Date(form.startDate).toLocaleDateString('fr-FR') : '______'}</u>, entre :</p>
<p><strong>Hyundai</strong>, ci-après dénommé <strong>« l'Employeur »</strong> ;</p>
<p>et</p>
<p><strong>${empName}</strong> ${emp ? `(Matricule : ${emp.matricule})` : ''}, ci-après dénommé(e) <strong>« le Salarié »</strong> ;</p>
<p>Ci-après collectivement dénommés <strong>« les Parties »</strong>.</p>

<h2>Article 1 — Nature et Durée du Contrat</h2>
<p>Le présent contrat est un <strong>${CONTRACT_TYPES.find(t => t.value === form.type)?.label ?? form.type}</strong>.</p>
<p>Le présent Contrat est régi par <em>le Code du Travail de la République Togolaise (Loi n° 2006-010 du 13 décembre 2006)</em>.</p>
${form.type === 'CDD' && form.endDate ? `<p>Il prend fin le <strong>${new Date(form.endDate).toLocaleDateString('fr-FR')}</strong>, sauf renouvellement exprès.</p>` : ''}

<h2>Article 2 — Poste et Fonctions</h2>
<p>Le Salarié est engagé en qualité de <strong>${form.position || '______'}</strong>, et s'engage à accomplir l'ensemble des tâches et responsabilités liées à ce poste telles que raisonnablement assignées par l'Employeur. Le Salarié s'engage à exercer ses fonctions avec diligence, loyauté et au mieux de ses capacités.</p>

<h2>Article 3 — Lieu de Travail</h2>
<p>Le lieu principal de travail du Salarié est situé dans les locaux de l'Employeur, ou en tout autre lieu que l'Employeur pourra raisonnablement désigner.</p>

<h2>Article 4 — Rémunération</h2>
<p>Le Salarié percevra un salaire brut de <strong>${form.currency} ${(parseFloat(form.salary) || 0).toLocaleString('fr-FR')}</strong>, payable sur une base ${(form.payFrequency || 'mensuelle').toLowerCase()}.</p>
${parseFloat(form.bonus) > 0 ? `<p>En plus du salaire de base, le Salarié percevra une prime/bonus de <strong>${form.currency} ${(parseFloat(form.bonus)).toLocaleString('fr-FR')}</strong>.</p>` : ''}
<p>La rémunération brute totale s'élève à <strong>${form.currency} ${totalGross.toLocaleString('fr-FR')}</strong> par mois.</p>
<p>Tous les paiements sont soumis aux retenues légales applicables, y compris l'impôt sur le revenu et les cotisations sociales, conformément à la législation de la République Togolaise.</p>

<h2>Article 5 — Période d'Essai</h2>
<p>Le Salarié effectuera une période d'essai de <strong>${trialText}</strong>${trialEnd ? ` à compter de la date du présent Contrat, se terminant le ${new Date(trialEnd).toLocaleDateString('fr-FR')}` : ' à compter de la date du présent Contrat'}.</p>

<h2>Article 6 — Heures de Travail</h2>
<p>L'horaire de travail est de <strong>${form.workSchedule}</strong>, soit <strong>${form.workHours} heures par semaine</strong> réparties sur <strong>${form.workDaysPerWeek} jours</strong>.</p>

<h2>Article 7 — Congés Annuels</h2>
<p>Le Salarié bénéficie de <strong>${form.annualLeaveDays} jours ouvrables</strong> de congé payé par an, conformément aux dispositions légales en vigueur.</p>

<h2>Article 8 — Confidentialité</h2>
<p>Le Salarié s'engage à maintenir la confidentialité des informations sensibles de l'Employeur pendant et après la durée du présent Contrat.</p>

<h2>Article 9 — Résiliation</h2>
<p>Le présent Contrat peut être résilié par l'une ou l'autre des Parties conformément aux dispositions du Code du Travail applicable. Un préavis sera donné selon les dispositions légales.</p>

<h2>Article 10 — Droit Applicable</h2>
<p>Le présent Contrat est régi par et interprété conformément aux lois de la République Togolaise.</p>

${clauses}

<p style="margin-top:32px">Fait en deux exemplaires originaux, à ____________, le ${form.startDate ? new Date(form.startDate).toLocaleDateString('fr-FR') : '______'}.</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:24px">
  <div><p><strong>Pour l'Employeur</strong></p><p style="margin-top:40px">Signature : _______________</p></div>
  <div><p><strong>Le Salarié</strong></p><p style="margin-top:40px">Signature : _______________</p></div>
</div>`
}

function ContractFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromId = searchParams.get('from')

  const [form, setForm] = useState(emptyForm)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [saving, setSaving] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['base', 'remuneration', 'hours', 'docs']))
  const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false)
  const [clauseDropdownOpen, setClauseDropdownOpen] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

  const selectedEmp = employees.find(e => e.id === parseInt(form.employeeId)) ?? null

  useEffect(() => {
    axios.get('/api/employees?limit=500').then(r => {
      const data = r.data
      setEmployees(Array.isArray(data) ? data : data.employees ?? [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (fromId) {
      axios.get(`/api/contracts/${fromId}`).then(r => {
        const c = r.data
        setForm(f => ({
          ...f,
          type: c.type ?? f.type,
          position: c.position ?? '',
          department: c.department ?? '',
          salary: String(c.salary ?? ''),
          bonus: String(c.bonus ?? ''),
          workSchedule: c.workHours ?? f.workSchedule,
          workHours: '40',
          workDaysPerWeek: String(c.workDaysPerWeek ?? '5'),
          annualLeaveDays: String(c.annualLeaveDays ?? '21'),
          currency: c.currency ?? 'XOF',
          payFrequency: c.payFrequency ?? 'Mensuel',
          language: c.language ?? 'Français',
          workerCategory: c.workerCategory ?? '',
        }))
      }).catch(() => {})
    }
  }, [fromId])

  // Auto-fill position/department/salary from selected employee
  useEffect(() => {
    if (selectedEmp) {
      setForm(f => ({
        ...f,
        position: f.position || selectedEmp.position || '',
        department: f.department || selectedEmp.department || '',
        salary: f.salary || String(selectedEmp.baseSalary ?? ''),
      }))
    }
  }, [selectedEmp])

  function toggleSection(key: string) {
    setOpenSections(prev => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
  }

  function exec(cmd: string, val?: string) {
    document.execCommand(cmd, false, val)
    editorRef.current?.focus()
  }

  function insertField(field: string) {
    editorRef.current?.focus()
    document.execCommand('insertText', false, field)
    setFieldDropdownOpen(false)
  }

  function addClause(text: string) {
    setForm(f => ({ ...f, customClauses: [...f.customClauses, text] }))
    setClauseDropdownOpen(false)
  }

  function downloadPDF() {
    const html = buildContractHTML(form, selectedEmp)
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Contrat</title>
<style>
  body { font-family: Georgia, serif; padding: 40px 60px; font-size: 13px; line-height: 1.7; color: #222; max-width: 800px; margin: 0 auto; }
  h2 { font-size: 14px; font-weight: bold; margin-top: 20px; margin-bottom: 6px; }
  p { margin: 6px 0; }
  @media print { body { padding: 20px; } }
</style></head><body>${html}</body></html>`)
    win.document.close()
    win.onload = () => { win.print() }
  }

  async function handleSave() {
    if (!form.employeeId || !form.type || !form.startDate || !form.salary) return
    setSaving(true)
    try {
      const emp = employees.find(e => e.id === parseInt(form.employeeId))
      const contractNo = `CTR-${emp?.matricule ?? form.employeeId}-${Date.now()}`
      const trialEndDate = computeTrialEndDate(form.startDate, form.trialDays)
      await axios.post('/api/contracts', {
        contractNo,
        employeeId: parseInt(form.employeeId),
        type: form.type,
        position: form.position || null,
        department: form.department || null,
        salary: parseFloat(form.salary) || 0,
        bonus: form.bonus ? parseFloat(form.bonus) : null,
        startDate: form.startDate,
        endDate: form.endDate || null,
        trialEndDate: trialEndDate || null,
        workHours: form.workSchedule || null,
        workerCategory: form.workerCategory || null,
        annualLeaveDays: form.annualLeaveDays ? parseInt(form.annualLeaveDays) : null,
        currency: form.currency || 'XOF',
        payFrequency: form.payFrequency || null,
        language: form.language || null,
        workDaysPerWeek: form.workDaysPerWeek ? parseInt(form.workDaysPerWeek) : null,
        status: form.status,
      })
      router.push('/contracts')
    } catch (err: any) {
      alert('Erreur: ' + (err.response?.data?.error || err.message))
    } finally { setSaving(false) }
  }

  const ic = 'w-full px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

  function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    const open = openSections.has(id)
    return (
      <div className="border border-outline-variant rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-container-low transition-colors text-left"
        >
          <span className="text-title-sm font-semibold text-on-surface">{title}</span>
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
            {open ? 'expand_less' : 'expand_more'}
          </span>
        </button>
        {open && <div className="px-4 pb-4 pt-2 space-y-3 bg-surface">{children}</div>}
      </div>
    )
  }

  const contractHTML = buildContractHTML(form, selectedEmp)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-headline-md font-semibold text-on-surface">Nouveau contrat</h1>
        <div className="flex items-center gap-2">
          <button onClick={downloadPDF} className="btn-secondary">
            <span className="material-symbols-outlined text-[15px]">download</span>
            Télécharger le PDF
          </button>
          <button onClick={() => router.push('/contracts')} className="btn-secondary">
            <span className="material-symbols-outlined text-[15px]">arrow_back</span>
            Retour
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* LEFT: form */}
        <div className="w-[440px] flex-shrink-0 space-y-3 overflow-y-auto pr-1 pb-4">
          <Section id="base" title="Informations de base">
            <div>
              <label className="label">Évaluateur un candidat</label>
              <select className={ic} value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}>
                <option value="">Choisir un candidat...</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.matricule})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type de contrat</label>
                <select className={ic} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">date de début</label>
                <input type="date" className={ic} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="label">Langue du contrat</label>
                <select className={ic} value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Période d'essai</label>
                <select className={ic} value={form.trialDays} onChange={e => setForm(f => ({ ...f, trialDays: e.target.value }))}>
                  {TRIAL_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            {form.type === 'CDD' && (
              <div>
                <label className="label">Date de fin *</label>
                <input type="date" className={ic} value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            )}
          </Section>

          <Section id="remuneration" title="Rémunération">
            <div>
              <label className="label">Salaire brut</label>
              <input type="number" className={ic} placeholder="0,00" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Concevoir</label>
                <select className={ic} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <p className="text-caption text-on-surface-variant mt-1">Définie automatiquement selon le pays de travail</p>
              </div>
              <div>
                <label className="label">Fréquence de paiement</label>
                <select className={ic} value={form.payFrequency} onChange={e => setForm(f => ({ ...f, payFrequency: e.target.value }))}>
                  {PAY_FREQUENCIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Indemnités</label>
              <div className="flex gap-2">
                <input className={ic} placeholder="Nom de l'indemnité" />
                <input type="number" className={`${ic} w-32`} placeholder="Montant" value={form.bonus} onChange={e => setForm(f => ({ ...f, bonus: e.target.value }))} />
                <button className="btn-secondary whitespace-nowrap">
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  Ajouter une indemnité
                </button>
              </div>
            </div>
          </Section>

          <Section id="hours" title="Heures de travail">
            <div>
              <label className="label">Horaire de travail</label>
              <select className={ic} value={form.workSchedule} onChange={e => setForm(f => ({ ...f, workSchedule: e.target.value }))}>
                {SCHEDULE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Heures/semaine</label>
                <input type="number" className={ic} value={form.workHours} onChange={e => setForm(f => ({ ...f, workHours: e.target.value }))} />
              </div>
              <div>
                <label className="label">Jours de travail par semaine</label>
                <input type="number" className={ic} value={form.workDaysPerWeek} onChange={e => setForm(f => ({ ...f, workDaysPerWeek: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Jours de congé annuel</label>
              <input type="number" className={ic} value={form.annualLeaveDays} onChange={e => setForm(f => ({ ...f, annualLeaveDays: e.target.value }))} />
            </div>
          </Section>

          <Section id="docs" title="Joindre des documents">
            <div className="text-center py-4 border-2 border-dashed border-outline-variant rounded-lg text-on-surface-variant">
              <span className="material-symbols-outlined text-2xl block mb-1">upload_file</span>
              <p className="text-body-md">Aucun document dans la bibliothèque</p>
              <button className="text-primary text-body-md mt-1 hover:underline">Télécharger des documents</button>
            </div>
          </Section>

          {/* Save */}
          <div className="flex gap-2 pt-2">
            <button onClick={() => router.push('/contracts')} className="btn-secondary flex-1">Annuler</button>
            <button
              onClick={handleSave}
              disabled={saving || !form.employeeId || !form.startDate || !form.salary}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer le contrat'}
            </button>
          </div>
        </div>

        {/* RIGHT: contract preview */}
        <div className="flex-1 flex flex-col min-h-0 border border-outline-variant rounded-xl overflow-hidden">
          {/* Editor toolbar */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-outline-variant bg-surface-container-lowest flex-wrap">
            <button onClick={() => exec('bold')} className="p-1.5 rounded hover:bg-surface-variant text-on-surface-variant font-bold text-body-md" title="Gras">B</button>
            <button onClick={() => exec('italic')} className="p-1.5 rounded hover:bg-surface-variant text-on-surface-variant italic text-body-md" title="Italique">I</button>
            <button onClick={() => exec('underline')} className="p-1.5 rounded hover:bg-surface-variant text-on-surface-variant underline text-body-md" title="Souligner">U</button>
            <button onClick={() => exec('formatBlock', 'h2')} className="p-1.5 rounded hover:bg-surface-variant text-on-surface-variant text-body-md font-semibold" title="Titre 2">H2</button>
            <button onClick={() => exec('formatBlock', 'h3')} className="p-1.5 rounded hover:bg-surface-variant text-on-surface-variant text-body-md" title="Titre 3">H3</button>
            <div className="w-px h-4 bg-outline-variant mx-1" />
            <button onClick={() => exec('insertUnorderedList')} className="p-1.5 rounded hover:bg-surface-variant text-on-surface-variant" title="Liste">
              <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
            </button>
            <button onClick={() => exec('insertOrderedList')} className="p-1.5 rounded hover:bg-surface-variant text-on-surface-variant" title="Liste numérotée">
              <span className="material-symbols-outlined text-[16px]">format_list_numbered</span>
            </button>
            <div className="w-px h-4 bg-outline-variant mx-1" />
            {/* Insert field */}
            <div className="relative">
              <button
                onClick={() => { setFieldDropdownOpen(f => !f); setClauseDropdownOpen(false) }}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-variant text-on-surface text-body-md border border-outline-variant"
              >
                <span className="material-symbols-outlined text-[14px]">add_circle</span>
                Insérer un champ
                <span className="material-symbols-outlined text-[13px]">expand_more</span>
              </button>
              {fieldDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFieldDropdownOpen(false)} />
                  <div className="absolute left-0 mt-1 w-52 bg-surface border border-outline-variant rounded-xl shadow-level-1 py-1 z-50">
                    {FIELD_TEMPLATES.map(f => (
                      <button key={f.value} onClick={() => insertField(f.value)}
                        className="w-full text-left px-3 py-1.5 text-body-md text-on-surface hover:bg-surface-container-low transition-colors">
                        {f.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {/* Insert clause */}
            <div className="relative">
              <button
                onClick={() => { setClauseDropdownOpen(c => !c); setFieldDropdownOpen(false) }}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-variant text-on-surface text-body-md border border-outline-variant"
              >
                <span className="material-symbols-outlined text-[14px]">library_add</span>
                Insérer une clause
                <span className="material-symbols-outlined text-[13px]">expand_more</span>
              </button>
              {clauseDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setClauseDropdownOpen(false)} />
                  <div className="absolute left-0 mt-1 w-56 bg-surface border border-outline-variant rounded-xl shadow-level-1 py-1 z-50">
                    {CLAUSE_TEMPLATES.map(cl => (
                      <button key={cl.label} onClick={() => addClause(cl.text)}
                        className="w-full text-left px-3 py-1.5 text-body-md text-on-surface hover:bg-surface-container-low transition-colors">
                        {cl.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="ml-auto">
              <button
                onClick={() => {
                  if (editorRef.current) {
                    setForm(f => ({ ...f })) // trigger re-render
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-variant text-on-surface text-body-md border border-outline-variant"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span>
                Régénérer depuis le modèle
              </button>
            </div>
          </div>

          {/* Contract content */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="flex-1 overflow-y-auto p-6 bg-white text-[13px] leading-relaxed focus:outline-none"
            style={{ fontFamily: 'Georgia, serif' }}
            dangerouslySetInnerHTML={{ __html: contractHTML }}
            onInput={() => {}}
          />
        </div>
      </div>
    </div>
  )
}

export default function NewContractPage() {
  return (
    <Suspense>
      <ContractFormContent />
    </Suspense>
  )
}
