'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

const SCHEDULE_TYPES = ['Temps plein', 'Temps partiel', 'Flexible']
const CURRENCIES = ['XOF', 'FCFA', 'EUR', 'USD']
const PAY_FREQUENCIES = ['Mensuel', 'Bimensuel', 'Hebdomadaire']
const LANGUAGES = ['Français', 'Anglais']

const CLAUSE_TEMPLATES = [
  { label: 'Confidentialité', text: 'Le Salarié s\'engage à maintenir strictement confidentielle toute information relative à l\'Employeur, ses clients, ses procédés et ses affaires.' },
  { label: 'Non-concurrence', text: 'Le Salarié s\'interdit, pendant la durée du contrat et pour une période de 12 mois après sa cessation, d\'exercer toute activité concurrente directe ou indirecte.' },
  { label: 'Dédit-formation', text: 'En cas de rupture du contrat à l\'initiative du Salarié dans les 24 mois suivant la fin d\'une formation prise en charge par l\'Employeur, le Salarié s\'engage à rembourser les frais engagés.' },
  { label: 'Exclusivité', text: 'Le Salarié consacre l\'intégralité de son activité professionnelle à l\'Employeur.' },
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

function computeTrialEndDate(startDate: string, trialDays: string): string {
  if (!startDate || !trialDays) return ''
  const d = new Date(startDate)
  d.setDate(d.getDate() + parseInt(trialDays))
  return d.toISOString().split('T')[0]
}

function buildContractHTML(form: any, emp: Employee | null): string {
  const empName = emp ? `${emp.firstName} ${emp.lastName}` : '______'
  const trialText = form.trialDays ? `${form.trialDays} jours (${Math.round(parseInt(form.trialDays) / 30)} mois)` : 'Aucune'
  const trialEnd = computeTrialEndDate(form.startDate, form.trialDays)
  const totalGross = (parseFloat(form.salary) || 0) + (parseFloat(form.bonus) || 0)

  const clauses = (form.customClauses ?? []).map((clause: string, i: number) =>
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
<p>Le Salarié est engagé en qualité de <strong>${form.position || '______'}</strong>, et s'engage à accomplir l'ensemble des tâches liées à ce poste.</p>

<h2>Article 3 — Lieu de Travail</h2>
<p>Le lieu principal de travail est situé dans les locaux de l'Employeur.</p>

<h2>Article 4 — Rémunération</h2>
<p>Le Salarié percevra un salaire brut de <strong>${form.currency} ${(parseFloat(form.salary) || 0).toLocaleString('fr-FR')}</strong>, payable sur une base ${(form.payFrequency || 'mensuelle').toLowerCase()}.</p>
${parseFloat(form.bonus) > 0 ? `<p>Indemnités : <strong>${form.currency} ${parseFloat(form.bonus).toLocaleString('fr-FR')}</strong>.</p>` : ''}
<p>La rémunération brute totale s'élève à <strong>${form.currency} ${totalGross.toLocaleString('fr-FR')}</strong> par mois.</p>

<h2>Article 5 — Période d'Essai</h2>
<p>Le Salarié effectuera une période d'essai de <strong>${trialText}</strong>${trialEnd ? ` se terminant le ${new Date(trialEnd).toLocaleDateString('fr-FR')}` : ''}.</p>

<h2>Article 6 — Heures de Travail</h2>
<p>Horaire : <strong>${form.workSchedule}</strong>, soit <strong>${form.workHours} heures/semaine</strong> sur <strong>${form.workDaysPerWeek} jours</strong>.</p>

<h2>Article 7 — Congés Annuels</h2>
<p>Le Salarié bénéficie de <strong>${form.annualLeaveDays} jours ouvrables</strong> de congé payé par an.</p>

<h2>Article 8 — Confidentialité</h2>
<p>Le Salarié s'engage à maintenir la confidentialité des informations sensibles de l'Employeur.</p>

<h2>Article 9 — Résiliation</h2>
<p>Résiliation conformément au Code du Travail applicable.</p>

<h2>Article 10 — Droit Applicable</h2>
<p>Le présent Contrat est régi par les lois de la République Togolaise.</p>

${clauses}

<p style="margin-top:32px">Fait en deux exemplaires, à ____________, le ${form.startDate ? new Date(form.startDate).toLocaleDateString('fr-FR') : '______'}.</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:24px">
  <div><p><strong>Pour l'Employeur</strong></p><p style="margin-top:40px">Signature : _______________</p></div>
  <div><p><strong>Le Salarié</strong></p><p style="margin-top:40px">Signature : _______________</p></div>
</div>`
}

export default function EditContractPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [form, setForm] = useState<any>({
    employeeId: '', type: 'CDI', position: '', department: '', salary: '',
    bonus: '', startDate: '', endDate: '', trialDays: '', workSchedule: 'Temps plein',
    workHours: '40', workDaysPerWeek: '5', annualLeaveDays: '21', currency: 'XOF',
    payFrequency: 'Mensuel', language: 'Français', workerCategory: '', status: 'ACTIVE',
    customClauses: [],
  })
  const [employees, setEmployees] = useState<Employee[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['base', 'remuneration', 'hours', 'docs']))
  const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false)
  const [clauseDropdownOpen, setClauseDropdownOpen] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

  const selectedEmp = employees.find(e => e.id === parseInt(form.employeeId)) ?? null

  useEffect(() => {
    Promise.all([
      axios.get('/api/employees?limit=500'),
      axios.get(`/api/contracts/${id}`),
    ]).then(([empRes, cRes]) => {
      const emps = empRes.data
      setEmployees(Array.isArray(emps) ? emps : emps.employees ?? [])
      const c = cRes.data
      setForm({
        employeeId: String(c.employeeId ?? ''),
        type: c.type ?? 'CDI',
        position: c.position ?? '',
        department: c.department ?? '',
        salary: String(c.salary ?? ''),
        bonus: String(c.bonus ?? ''),
        startDate: c.startDate ? c.startDate.split('T')[0] : '',
        endDate: c.endDate ? c.endDate.split('T')[0] : '',
        trialDays: '',
        workSchedule: c.workHours ?? 'Temps plein',
        workHours: '40',
        workDaysPerWeek: String(c.workDaysPerWeek ?? '5'),
        annualLeaveDays: String(c.annualLeaveDays ?? '21'),
        currency: c.currency ?? 'XOF',
        payFrequency: c.payFrequency ?? 'Mensuel',
        language: c.language ?? 'Français',
        workerCategory: c.workerCategory ?? '',
        status: c.status ?? 'ACTIVE',
        customClauses: [],
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  function toggleSection(key: string) {
    setOpenSections(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
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
    setForm((f: any) => ({ ...f, customClauses: [...f.customClauses, text] }))
    setClauseDropdownOpen(false)
  }

  function downloadPDF() {
    const html = buildContractHTML(form, selectedEmp)
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Contrat</title>
<style>body{font-family:Georgia,serif;padding:40px 60px;font-size:13px;line-height:1.7;color:#222;max-width:800px;margin:0 auto}h2{font-size:14px;font-weight:bold;margin-top:20px;margin-bottom:6px}p{margin:6px 0}</style>
</head><body>${html}</body></html>`)
    win.document.close()
    win.onload = () => { win.print() }
  }

  async function handleSave() {
    if (!form.type || !form.startDate) return
    setSaving(true)
    try {
      const trialEndDate = computeTrialEndDate(form.startDate, form.trialDays)
      await axios.put(`/api/contracts/${id}`, {
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

  function Section({ id: sid, title, children }: { id: string; title: string; children: React.ReactNode }) {
    const open = openSections.has(sid)
    return (
      <div className="border border-outline-variant rounded-xl overflow-hidden">
        <button onClick={() => toggleSection(sid)} className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-container-low transition-colors text-left">
          <span className="text-title-sm font-semibold text-on-surface">{title}</span>
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">{open ? 'expand_less' : 'expand_more'}</span>
        </button>
        {open && <div className="px-4 pb-4 pt-2 space-y-3 bg-surface">{children}</div>}
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
  }

  const contractHTML = buildContractHTML(form, selectedEmp)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-headline-md font-semibold text-on-surface">Modifier le contrat</h1>
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
        <div className="w-[440px] flex-shrink-0 space-y-3 overflow-y-auto pr-1 pb-4">
          <Section id="base" title="Informations de base">
            <div>
              <label className="label">Employé</label>
              <input className={`${ic} bg-surface-container-low`} disabled
                value={selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName} (${selectedEmp.matricule})` : ''} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type de contrat</label>
                <select className={ic} value={form.type} onChange={e => setForm((f: any) => ({ ...f, type: e.target.value }))}>
                  {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date de début</label>
                <input type="date" className={ic} value={form.startDate} onChange={e => setForm((f: any) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="label">Langue</label>
                <select className={ic} value={form.language} onChange={e => setForm((f: any) => ({ ...f, language: e.target.value }))}>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Période d'essai</label>
                <select className={ic} value={form.trialDays} onChange={e => setForm((f: any) => ({ ...f, trialDays: e.target.value }))}>
                  {TRIAL_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            {form.type === 'CDD' && (
              <div>
                <label className="label">Date de fin</label>
                <input type="date" className={ic} value={form.endDate} onChange={e => setForm((f: any) => ({ ...f, endDate: e.target.value }))} />
              </div>
            )}
            <div>
              <label className="label">Statut</label>
              <select className={ic} value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}>
                <option value="ACTIVE">Actif</option>
                <option value="EXPIRED">Expiré</option>
                <option value="TERMINATED">Résilié</option>
              </select>
            </div>
          </Section>

          <Section id="remuneration" title="Rémunération">
            <div>
              <label className="label">Salaire brut</label>
              <input type="number" className={ic} placeholder="0,00" value={form.salary} onChange={e => setForm((f: any) => ({ ...f, salary: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Devise</label>
                <select className={ic} value={form.currency} onChange={e => setForm((f: any) => ({ ...f, currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Fréquence de paiement</label>
                <select className={ic} value={form.payFrequency} onChange={e => setForm((f: any) => ({ ...f, payFrequency: e.target.value }))}>
                  {PAY_FREQUENCIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Indemnités (bonus)</label>
              <input type="number" className={ic} placeholder="0" value={form.bonus} onChange={e => setForm((f: any) => ({ ...f, bonus: e.target.value }))} />
            </div>
          </Section>

          <Section id="hours" title="Heures de travail">
            <div>
              <label className="label">Horaire de travail</label>
              <select className={ic} value={form.workSchedule} onChange={e => setForm((f: any) => ({ ...f, workSchedule: e.target.value }))}>
                {SCHEDULE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Heures/semaine</label>
                <input type="number" className={ic} value={form.workHours} onChange={e => setForm((f: any) => ({ ...f, workHours: e.target.value }))} />
              </div>
              <div>
                <label className="label">Jours/semaine</label>
                <input type="number" className={ic} value={form.workDaysPerWeek} onChange={e => setForm((f: any) => ({ ...f, workDaysPerWeek: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Jours de congé annuels</label>
              <input type="number" className={ic} value={form.annualLeaveDays} onChange={e => setForm((f: any) => ({ ...f, annualLeaveDays: e.target.value }))} />
            </div>
          </Section>

          <div className="flex gap-2 pt-2">
            <button onClick={() => router.push('/contracts')} className="btn-secondary flex-1">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>

        {/* Contract preview */}
        <div className="flex-1 flex flex-col min-h-0 border border-outline-variant rounded-xl overflow-hidden">
          <div className="flex items-center gap-1 px-3 py-2 border-b border-outline-variant bg-surface-container-lowest flex-wrap">
            <button onClick={() => exec('bold')} className="p-1.5 rounded hover:bg-surface-variant text-on-surface-variant font-bold text-body-md">B</button>
            <button onClick={() => exec('italic')} className="p-1.5 rounded hover:bg-surface-variant text-on-surface-variant italic text-body-md">I</button>
            <button onClick={() => exec('underline')} className="p-1.5 rounded hover:bg-surface-variant text-on-surface-variant underline text-body-md">U</button>
            <button onClick={() => exec('formatBlock', 'h2')} className="p-1.5 rounded hover:bg-surface-variant text-on-surface-variant font-semibold text-body-md">H2</button>
            <div className="w-px h-4 bg-outline-variant mx-1" />
            <button onClick={() => exec('insertUnorderedList')} className="p-1.5 rounded hover:bg-surface-variant text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
            </button>
            <button onClick={() => exec('insertOrderedList')} className="p-1.5 rounded hover:bg-surface-variant text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">format_list_numbered</span>
            </button>
            <div className="w-px h-4 bg-outline-variant mx-1" />
            <div className="relative">
              <button onClick={() => { setFieldDropdownOpen(f => !f); setClauseDropdownOpen(false) }}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-variant text-on-surface text-body-md border border-outline-variant">
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
                        className="w-full text-left px-3 py-1.5 text-body-md text-on-surface hover:bg-surface-container-low">{f.label}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <button onClick={() => { setClauseDropdownOpen(c => !c); setFieldDropdownOpen(false) }}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-variant text-on-surface text-body-md border border-outline-variant">
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
                        className="w-full text-left px-3 py-1.5 text-body-md text-on-surface hover:bg-surface-container-low">{cl.label}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
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
