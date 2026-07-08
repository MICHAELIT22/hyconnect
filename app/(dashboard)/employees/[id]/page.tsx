'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import axios from 'axios'

interface Employee {
  id: number
  matricule: string
  firstName: string
  lastName: string
  sex: string | null
  nationality: string | null
  birthDate: string | null
  birthPlace: string | null
  maritalStatus: string | null
  childrenCount: number | null
  address: string | null
  city: string | null
  country: string | null
  phone1: string | null
  phone2: string | null
  email: string
  department: string | null
  position: string | null
  service: string | null
  hireDate: string | null
  status: string
  baseSalary: number | null
  transportAllowance: number | null
  housingAllowance: number | null
  positionAllowance: number | null
  photoPath: string | null
  bankName: string | null
  accountNumber: string | null
  iban: string | null
  swift: string | null
  nationalId: string | null
  socialSecurityNumber: string | null
  passportNumber: string | null
  taxId: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  emergencyContactRelation: string | null
  employmentType: string | null
  workLocation: string | null
  probationEndDate: string | null
  manager: string | null
  category: string | null
  contracts: Array<{ id: number; contractNo: string; type: string; status: string; startDate: string; endDate: string | null; salary: number; annualLeaveDays: number | null }>
  leaves: Array<{ id: number; type: string; startDate: string; endDate: string; status: string; reason: string | null }>
  attendances: Array<{ id: number; date: string; checkIn: string | null; checkOut: string | null; isLate: boolean; absence: boolean; overtime: number | null }>
  trainings: Array<{ id: number; title: string; organization: string; date: string; certificate: boolean }>
  medicals: Array<{ id: number; date: string; doctor: string | null; result: string | null; nextVisit: string | null }>
  documents: Array<{ id: number; name: string; type: string; category: string; expiryDate: string | null; status: string }>
}

const TABS = [
  { id: 'apercu', label: 'Aperçu' },
  { id: 'personnel', label: 'Personnel' },
  { id: 'emploi', label: 'Emploi' },
  { id: 'conges', label: 'Congés' },
  { id: 'temps', label: 'Temps & Présence' },
  { id: 'paie', label: 'Paie' },
  { id: 'documents', label: 'Documents' },
  { id: 'evaluation', label: 'Évaluation' },
]

const COUNTRIES = ['Togo', 'Bénin', 'Ghana', 'Côte d\'Ivoire', 'Sénégal', 'Mali', 'Burkina Faso', 'Niger', 'Cameroun', 'Nigeria', 'France', 'Autre']
const NATIONALITIES = ['Togolaise', 'Béninoise', 'Ghanéenne', 'Ivoirienne', 'Sénégalaise', 'Malienne', 'Burkinabè', 'Nigérienne', 'Camerounaise', 'Nigériane', 'Française', 'Autre']
const COUNTRY_FLAGS: Record<string, string> = { Togo: '🇹🇬', Bénin: '🇧🇯', Ghana: '🇬🇭', France: '🇫🇷', Nigeria: '🇳🇬', Cameroun: '🇨🇲' }

function calcSeniority(hireDate: string | null) {
  if (!hireDate) return '—'
  const hire = new Date(hireDate)
  const now = new Date()
  let years = now.getFullYear() - hire.getFullYear()
  let months = now.getMonth() - hire.getMonth()
  let days = now.getDate() - hire.getDate()
  if (days < 0) { months--; days += 30 }
  if (months < 0) { years--; months += 12 }
  if (years === 0 && months === 0) return `${days}j`
  if (years === 0) return `${months}m ${days}j`
  return `${years}a ${months}m`
}

function daysUntilBirthday(birthDate: string | null) {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  const next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
  if (next <= today) next.setFullYear(today.getFullYear() + 1)
  return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function ic(disabled: boolean) {
  return `w-full px-3 py-2 rounded-lg border text-body-md transition-colors ${
    disabled
      ? 'bg-surface-container-low border-transparent text-on-surface-variant cursor-default'
      : 'bg-surface border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
  }`
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="block text-caption text-secondary mb-1">{children}</label>
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-label-md font-semibold text-primary uppercase tracking-wide mt-5 mb-2 first:mt-0">{children}</h3>
}

function EmployeeDetailContent() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('apercu')
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const load = () => {
    setLoading(true)
    axios.get(`/api/employees/${id}`)
      .then(r => { setEmployee(r.data); setForm(r.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  // Auto-activate edit mode if ?edit=true
  useEffect(() => {
    if (searchParams.get('edit') === 'true' && employee) {
      setForm({ ...employee })
      setEditMode(true)
    }
  }, [searchParams, employee])

  const startEdit = () => { setForm({ ...employee }); setEditMode(true) }
  const cancelEdit = () => { setEditMode(false); setSaveError('') }

  const save = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await axios.put(`/api/employees/${id}`, form)
      load()
      setEditMode(false)
    } catch (e: any) {
      setSaveError(e.response?.data?.error || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f: any) => ({ ...f, [field]: e.target.value }))

  const val = (field: string) => editMode ? (form[field] ?? '') : (employee?.[field as keyof Employee] ?? '')

  if (loading) return (
    <div className="space-y-3 animate-pulse">
      <div className="h-14 bg-surface-variant rounded-xl" />
      <div className="h-8 bg-surface-variant rounded-xl w-2/3" />
      <div className="h-64 bg-surface-variant rounded-xl" />
    </div>
  )

  if (!employee) return (
    <div className="text-center py-12">
      <p className="text-on-surface-variant">Employé non trouvé</p>
      <button onClick={() => router.back()} className="btn-primary mt-4">Retour</button>
    </div>
  )

  const isExpat = employee.nationality && !['Togolaise', 'Togolais'].includes(employee.nationality)
  const flag = COUNTRY_FLAGS[employee.country ?? ''] ?? '🌍'

  // ── APERÇU ──────────────────────────────────────────────────────────────────
  const approvedDays = employee.leaves.filter(l => l.status === 'APPROVED').reduce((acc, l) =>
    acc + Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1, 0)
  const pendingCount = employee.leaves.filter(l => l.status === 'PENDING').length
  const bDays = daysUntilBirthday(employee.birthDate)

  const apercuTab = (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Ancienneté', value: calcSeniority(employee.hireDate) },
          { label: 'Prochain anniversaire', value: bDays != null ? `dans ${bDays} jours` : '—' },
          { label: 'Congés restants', value: `${approvedDays}d` },
          { label: 'Congés en attente', value: pendingCount || '–' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface rounded-xl border border-outline-variant p-3">
            <p className="text-caption text-on-surface-variant">{label}</p>
            <p className="text-title-sm font-bold text-on-surface mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface rounded-xl border border-outline-variant p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant">schedule</span>
            <h3 className="text-body-md font-semibold">Activité récente</h3>
          </div>
          <div className="space-y-3">
            {employee.hireDate && (
              <div className="flex gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-surface-container-high mt-1 flex-shrink-0" />
                <div>
                  <p className="text-body-md text-on-surface">{employee.firstName} {employee.lastName} a été embauché(e)</p>
                  <p className="text-caption text-secondary">{new Date(employee.hireDate).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            )}
            {employee.contracts[0] && (
              <div className="flex gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-surface-container-high mt-1 flex-shrink-0" />
                <div>
                  <p className="text-body-md text-on-surface">Contrat créé : {employee.contracts[0].type === 'CDI' ? 'Durée indéterminée' : employee.contracts[0].type}</p>
                  <p className="text-caption text-secondary">{new Date(employee.contracts[0].startDate).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-outline-variant p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant">description</span>
              <h3 className="text-body-md font-semibold">Notes</h3>
            </div>
            <button className="btn-secondary" style={{ padding: '2px 8px', fontSize: '11px' }}>
              <span className="material-symbols-outlined text-[13px]">add</span>
              Ajouter une note
            </button>
          </div>
          <p className="text-body-md text-on-surface-variant text-center py-4">Aucune note pour le moment</p>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-outline-variant p-4 flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">person_add</span>
        </div>
        <p className="text-body-md font-semibold text-on-surface flex-1">Pas encore de compte</p>
        <button className="btn-primary">
          <span className="material-symbols-outlined text-[13px]">email</span>
          Envoyer une invitation
        </button>
      </div>
    </div>
  )

  // ── PERSONNEL ───────────────────────────────────────────────────────────────
  const personnelTab = (
    <div className="bg-surface rounded-xl border border-outline-variant p-5">
      <div className="grid grid-cols-3 gap-4">
        <div><Lbl>Prénom</Lbl><input value={String(val('firstName'))} onChange={set('firstName')} disabled={!editMode} className={ic(!editMode)} /></div>
        <div><Lbl>Nom</Lbl><input value={String(val('lastName'))} onChange={set('lastName')} disabled={!editMode} className={ic(!editMode)} /></div>
        <div><Lbl>Email</Lbl><input value={String(val('email'))} onChange={set('email')} disabled={!editMode} className={ic(!editMode)} /></div>
        <div><Lbl>Téléphone</Lbl><input value={String(val('phone1'))} onChange={set('phone1')} disabled={!editMode} className={ic(!editMode)} /></div>
        <div>
          <Lbl>Date de naissance</Lbl>
          <input
            type={editMode ? 'date' : 'text'}
            value={editMode ? String(val('birthDate')).split('T')[0] : (employee.birthDate ? new Date(employee.birthDate).toLocaleDateString('fr-FR') : 'JJ/MM/AAAA')}
            onChange={set('birthDate')}
            disabled={!editMode}
            className={ic(!editMode)}
          />
        </div>
        <div>
          <Lbl>Nationalité</Lbl>
          {editMode
            ? <select value={form.nationality || ''} onChange={set('nationality')} className={ic(false)}>{NATIONALITIES.map(n => <option key={n}>{n}</option>)}</select>
            : <input value={employee.nationality || ''} disabled className={ic(true)} />
          }
        </div>
        <div>
          <Lbl>Statut</Lbl>
          {editMode
            ? <select value={form.status || 'ACTIVE'} onChange={set('status')} className={ic(false)}>
                <option value="ACTIVE">active</option>
                <option value="LEAVE">En congé</option>
                <option value="INACTIVE">Inactif</option>
              </select>
            : <input value={employee.status === 'ACTIVE' ? 'active' : employee.status === 'LEAVE' ? 'En congé' : 'Inactif'} disabled className={ic(true)} />
          }
        </div>
      </div>

      <SecTitle>Documents d'identité</SecTitle>
      <div className="grid grid-cols-2 gap-4">
        <div><Lbl>National ID Card (CIN)</Lbl><input value={String(val('nationalId'))} onChange={set('nationalId')} disabled={!editMode} placeholder="CIN number" className={ic(!editMode)} /></div>
        <div><Lbl>CNSS Number</Lbl><input value={String(val('socialSecurityNumber'))} onChange={set('socialSecurityNumber')} disabled={!editMode} placeholder="Social security number" className={ic(!editMode)} /></div>
        <div className="col-span-2"><Lbl>Tax ID (NIF)</Lbl><input value={String(val('taxId'))} onChange={set('taxId')} disabled={!editMode} placeholder="e.g. 1000XXXXXX" className={ic(!editMode)} /></div>
      </div>

      <SecTitle>Informations familiales</SecTitle>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Lbl>Situation familiale</Lbl>
          {editMode
            ? <select value={form.maritalStatus || ''} onChange={set('maritalStatus')} className={ic(false)}>
                <option>Célibataire</option><option>Marié(e)</option><option>Divorcé(e)</option><option>Veuf(ve)</option>
              </select>
            : <input value={employee.maritalStatus || 'single'} disabled className={ic(true)} />
          }
        </div>
        <div>
          <Lbl>Enfants à charge</Lbl>
          <input type={editMode ? 'number' : 'text'} value={String(val('childrenCount') ?? 0)} onChange={set('childrenCount')} disabled={!editMode} className={ic(!editMode)} />
          <p className="text-caption text-primary mt-0.5">Enfants à charge pour déduction IRPP — moins de 21 ans, ou 25 ans si étudiant</p>
        </div>
      </div>

      <SecTitle>Coordonnées bancaires</SecTitle>
      <div className="grid grid-cols-2 gap-4">
        <div><Lbl>Nom de la banque</Lbl><input value={String(val('bankName'))} onChange={set('bankName')} disabled={!editMode} className={ic(!editMode)} /></div>
        <div><Lbl>Compte bancaire</Lbl><input value={String(val('accountNumber'))} onChange={set('accountNumber')} disabled={!editMode} className={ic(!editMode)} /></div>
      </div>

      <SecTitle>Contact d'urgence</SecTitle>
      <div className="grid grid-cols-2 gap-4">
        <div><Lbl>Nom du contact</Lbl><input value={String(val('emergencyContactName'))} onChange={set('emergencyContactName')} disabled={!editMode} className={ic(!editMode)} /></div>
        <div><Lbl>Téléphone du contact</Lbl><input value={String(val('emergencyContactPhone'))} onChange={set('emergencyContactPhone')} disabled={!editMode} className={ic(!editMode)} /></div>
        <div className="col-span-2"><Lbl>Lien de parenté</Lbl><input value={String(val('emergencyContactRelation'))} onChange={set('emergencyContactRelation')} disabled={!editMode} className={ic(!editMode)} /></div>
      </div>
    </div>
  )

  // ── EMPLOI ───────────────────────────────────────────────────────────────────
  const emploiTab = (
    <div className="space-y-4">
      <div className="bg-surface rounded-xl border border-outline-variant p-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Lbl>Pays de travail</Lbl>
            {editMode
              ? <select value={form.country || ''} onChange={set('country')} className={ic(false)}>{COUNTRIES.map(c => <option key={c}>{c}</option>)}</select>
              : <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-low text-body-md text-on-surface-variant">
                  <span>{flag}</span><span>{employee.country || '—'}</span>
                </div>
            }
            <p className="text-caption text-secondary mt-0.5">À renseigner uniquement si différent du pays de l'entreprise (employé expatrié)</p>
          </div>
          <div><Lbl>Poste</Lbl><input value={String(val('position'))} onChange={set('position')} disabled={!editMode} placeholder="—" className={ic(!editMode)} /></div>
          <div><Lbl>Département</Lbl><input value={String(val('department'))} onChange={set('department')} disabled={!editMode} placeholder="—" className={ic(!editMode)} /></div>
          <div><Lbl>Succursale</Lbl><input value={String(val('workLocation'))} onChange={set('workLocation')} disabled={!editMode} placeholder="—" className={ic(!editMode)} /></div>
          <div>
            <Lbl>Date d'embauche</Lbl>
            <input
              type={editMode ? 'date' : 'text'}
              value={editMode ? String(val('hireDate')).split('T')[0] : (employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('fr-FR') : '—')}
              onChange={set('hireDate')}
              disabled={!editMode}
              className={ic(!editMode)}
            />
          </div>
          <div>
            <Lbl>Catégorie de travailleur</Lbl>
            {editMode
              ? <select value={form.category || ''} onChange={set('category')} className={ic(false)}>
                  <option value="">—</option>
                  <option value="monthly">monthly</option>
                  <option value="Mensuel">Mensuel</option>
                  <option value="Journalier">Journalier</option>
                  <option value="Horaire">Horaire</option>
                </select>
              : <input value={employee.category || ''} disabled placeholder="—" className={ic(true)} />
            }
          </div>
          <div className="col-span-3">
            <Lbl>Supérieur hiérarchique</Lbl>
            <input value={String(val('manager'))} onChange={set('manager')} disabled={!editMode} placeholder="—" className={ic(!editMode)} />
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant">
          <h3 className="text-body-md font-semibold">Historique d'emploi</h3>
          <button className="btn-secondary" style={{ padding: '2px 8px', fontSize: '11px' }}>
            <span className="material-symbols-outlined text-[13px]">add</span>
            Ajouter un événement
          </button>
        </div>
        <div className="p-4 space-y-3">
          {employee.hireDate && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[14px] text-on-surface-variant">event</span>
              </div>
              <div>
                <p className="text-body-md font-medium">Embauche</p>
                <p className="text-caption text-primary">{employee.firstName} {employee.lastName} a été embauché(e)</p>
                <p className="text-caption text-secondary mt-0.5">{new Date(employee.hireDate).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── CONGÉS ───────────────────────────────────────────────────────────────────
  const totalAllowance = employee.contracts[0]?.annualLeaveDays ?? 0
  const congesTab = (
    <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
        <h3 className="text-body-md font-semibold">Gestion des congés</h3>
        <button className="btn-primary">
          <span className="material-symbols-outlined text-[13px]">add</span>
          Enregistrer un congé
        </button>
      </div>
      <div className="p-4">
        <h4 className="text-body-md font-semibold mb-2">Soldes de congés</h4>
        <div className="flex items-center justify-between py-2 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant">beach_access</span>
            <span className="text-body-md">Congé Annuel</span>
          </div>
          <span className="text-body-md font-medium">{approvedDays} / {totalAllowance} jours</span>
        </div>
        <div className="flex items-center justify-between mb-3 mt-4">
          <h4 className="text-body-md font-semibold">Historique des congés</h4>
          <div className="flex gap-2">
            <select className="text-caption border border-outline-variant rounded px-2 py-1 bg-surface-container"><option>Année en cours</option></select>
            <select className="text-caption border border-outline-variant rounded px-2 py-1 bg-surface-container"><option>Tous les types</option></select>
          </div>
        </div>
        {employee.leaves.length === 0 ? (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-[32px] text-on-surface-variant">calendar_today</span>
            <p className="text-body-md text-on-surface-variant mt-2">Aucune demande de congé trouvée</p>
          </div>
        ) : (
          <div className="space-y-2">
            {employee.leaves.map(l => (
              <div key={l.id} className="flex items-center justify-between py-2 border-b border-outline-variant last:border-0">
                <div>
                  <p className="text-body-md font-medium">{l.type}</p>
                  <p className="text-caption text-secondary">{new Date(l.startDate).toLocaleDateString('fr-FR')} – {new Date(l.endDate).toLocaleDateString('fr-FR')}</p>
                </div>
                <span className={`text-caption px-2 py-0.5 rounded-full ${l.status === 'APPROVED' ? 'bg-tertiary/10 text-tertiary' : l.status === 'REJECTED' ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'}`}>
                  {l.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // ── TEMPS & PRÉSENCE ────────────────────────────────────────────────────────
  const nowDate = new Date()
  const cm = nowDate.getMonth(), cy = nowDate.getFullYear()
  const thisMonth = employee.attendances.filter(a => { const d = new Date(a.date); return d.getMonth() === cm && d.getFullYear() === cy })
  const presentDays = thisMonth.filter(a => !a.absence).length
  const workingDays = 23
  const attendanceRate = presentDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0
  const totalHours = thisMonth.reduce((acc, a) => acc + (a.overtime || 0), 0)

  const byMonth: Record<string, typeof employee.attendances> = {}
  employee.attendances.forEach(a => {
    const key = new Date(a.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(a)
  })
  const last12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(cy, cm - i, 1)
    return d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
  })

  const tempsTab = (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface rounded-xl border border-outline-variant p-4">
          <p className="text-caption text-on-surface-variant">Heures ce mois</p>
          <p className="text-display-lg font-bold text-on-surface mt-1">{totalHours}h</p>
          <p className="text-caption text-secondary">/ {workingDays * 8}h</p>
        </div>
        <div className={`bg-surface rounded-xl border p-4 ${attendanceRate < 80 ? 'border-warning' : 'border-outline-variant'}`}>
          <p className="text-caption text-on-surface-variant">Taux de présence</p>
          <p className={`text-display-lg font-bold mt-1 ${attendanceRate < 80 ? 'text-warning' : 'text-on-surface'}`}>{attendanceRate}%</p>
          <p className={`text-caption ${attendanceRate < 80 ? 'text-warning' : 'text-secondary'}`}>{attendanceRate < 80 ? 'Sous l\'objectif' : 'Objectif atteint'}</p>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4">
          <p className="text-caption text-on-surface-variant">Série de pointage</p>
          <p className="text-display-lg font-bold text-on-surface mt-1">0</p>
          <p className="text-caption text-secondary">0 jours consécutifs</p>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
        <div className="px-4 py-2.5 border-b border-outline-variant"><h3 className="text-body-md font-semibold">Résumé mensuel</h3></div>
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-body-md text-on-surface-variant">Heures ce mois</span>
          <span className="text-body-md font-medium">{totalHours}h / {workingDays * 8}h</span>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
        <div className="px-4 py-2.5 border-b border-outline-variant"><h3 className="text-body-md font-semibold">Historique de présence</h3></div>
        <div className="divide-y divide-outline-variant">
          {last12.map(month => {
            const entries = byMonth[month] || []
            const p = entries.filter(a => !a.absence).length
            const h = entries.reduce((acc, a) => acc + (a.overtime || 0), 0)
            const r = entries.length > 0 ? Math.round((p / entries.length) * 100) : 0
            return (
              <div key={month} className="px-4 py-2 flex items-center justify-between">
                <span className="text-body-md capitalize">{month}</span>
                <div className="flex items-center gap-6 text-caption text-secondary">
                  <span>{entries.length} jours</span>
                  <span>{h}h</span>
                  <span className={r > 0 && r < 80 ? 'text-warning' : r === 0 ? 'text-secondary' : 'text-tertiary'}>{r}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  // ── PAIE ────────────────────────────────────────────────────────────────────
  const paieTab = (
    <div className="space-y-4">
      <div className="bg-surface rounded-xl border border-outline-variant p-5">
        <div className="grid grid-cols-2 gap-4">
          <div><Lbl>CNSS Number</Lbl><input value={String(val('socialSecurityNumber'))} onChange={set('socialSecurityNumber')} disabled={!editMode} placeholder="Social security number" className={ic(!editMode)} /></div>
          <div><Lbl>Tax ID (NIF)</Lbl><input value={String(val('taxId'))} onChange={set('taxId')} disabled={!editMode} placeholder="e.g. 1000XXXXXX" className={ic(!editMode)} /></div>
          <div><Lbl>Nom de la banque</Lbl><input value={String(val('bankName'))} onChange={set('bankName')} disabled={!editMode} className={ic(!editMode)} /></div>
          <div><Lbl>Compte bancaire</Lbl><input value={String(val('accountNumber'))} onChange={set('accountNumber')} disabled={!editMode} className={ic(!editMode)} /></div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-outline-variant">
          <span className="material-symbols-outlined text-[15px] text-on-surface-variant">credit_card</span>
          <h3 className="text-body-md font-semibold">Mode de paiement</h3>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-lg border border-outline-variant">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">info</span>
            <div>
              <p className="text-body-md text-on-surface">Aucun fournisseur de paiement connecté</p>
              <p className="text-caption text-secondary">
                Connectez un fournisseur de paiement dans Paramètres → Paiements d'abord.{' '}
                <span className="text-primary cursor-pointer hover:underline">Paramètres de paiement</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ── DOCUMENTS ───────────────────────────────────────────────────────────────
  const documentsTab = (
    <div className="space-y-4">
      <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant">
          <h3 className="text-body-md font-semibold">Contrats</h3>
          <button onClick={() => router.push(`/contracts/new?employeeId=${employee.id}`)} className="btn-secondary" style={{ padding: '2px 8px', fontSize: '11px' }}>
            <span className="material-symbols-outlined text-[13px]">add</span>
            Nouveau
          </button>
        </div>
        <div className="p-4 space-y-2">
          {employee.contracts.length === 0
            ? <p className="text-body-md text-on-surface-variant text-center py-4">Aucun contrat</p>
            : employee.contracts.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-lg border border-outline-variant">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">description</span>
                <div className="flex-1">
                  <p className="text-body-md font-medium">{c.type === 'CDI' ? 'Durée indéterminée' : c.type}</p>
                  <p className="text-caption text-secondary">
                    {new Date(c.startDate).toLocaleDateString('fr-FR')} — {c.endDate ? new Date(c.endDate).toLocaleDateString('fr-FR') : '—'}
                  </p>
                </div>
                <span className="text-caption px-2 py-0.5 rounded-full bg-surface-container text-secondary border border-outline-variant">
                  Archivé
                </span>
              </div>
            ))
          }
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant">
          <h3 className="text-body-md font-semibold">Documents</h3>
          <button className="btn-secondary" style={{ padding: '2px 8px', fontSize: '11px' }}>
            <span className="material-symbols-outlined text-[13px]">upload</span>
            Téléverser
          </button>
        </div>
        <div className="p-4">
          {employee.documents.length === 0
            ? <p className="text-body-md text-on-surface-variant text-center py-4">Aucun document pour le moment</p>
            : employee.documents.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container-low">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">attach_file</span>
                <span className="text-body-md flex-1">{d.name}</span>
                <span className="text-caption text-secondary">{d.type}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )

  // ── ÉVALUATION ───────────────────────────────────────────────────────────────
  const evaluationTab = (
    <div className="bg-surface rounded-xl border border-outline-variant p-8 flex flex-col items-center justify-center min-h-[200px]">
      <span className="material-symbols-outlined text-[40px] text-on-surface-variant mb-3">payments</span>
      <p className="text-body-md text-on-surface-variant">Cet employé n'a pas encore d'avance sur salaire.</p>
    </div>
  )

  const tabContent: Record<string, React.ReactNode> = {
    apercu: apercuTab,
    personnel: personnelTab,
    emploi: emploiTab,
    conges: congesTab,
    temps: tempsTab,
    paie: paieTab,
    documents: documentsTab,
    evaluation: evaluationTab,
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-surface-variant text-on-surface-variant flex-shrink-0">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {employee.photoPath ? (
            <img src={employee.photoPath} alt="" className="w-9 h-9 rounded-full object-cover border border-outline-variant flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
              {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-title-sm font-bold text-on-surface">{employee.firstName} {employee.lastName}</span>
              {isExpat && <span className="text-caption px-1.5 py-0.5 bg-surface-container border border-outline-variant rounded text-secondary flex-shrink-0">Expat</span>}
            </div>
            <p className="text-caption text-secondary truncate">{employee.position || '—'} • {employee.email}</p>
          </div>
        </div>
        {!editMode ? (
          <>
            <button onClick={startEdit} className="btn-secondary flex-shrink-0">
              <span className="material-symbols-outlined text-[13px]">edit</span>
              Modifier
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-md border border-error text-error hover:bg-error-container transition-all flex-shrink-0">
              <span className="material-symbols-outlined text-[13px]">exit_to_app</span>
              Départ de l'employé
            </button>
          </>
        ) : (
          <>
            <button onClick={cancelEdit} className="btn-secondary flex-shrink-0">Annuler</button>
            <button onClick={save} disabled={saving} className="btn-primary flex-shrink-0">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </>
        )}
      </div>

      {saveError && (
        <div className="bg-error-container text-on-error-container p-3 rounded-lg text-body-md">{saveError}</div>
      )}

      {/* Tabs */}
      <div className="border-b border-outline-variant">
        <div className="flex">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-body-md font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {tabContent[activeTab]}
    </div>
  )
}

export default function EmployeeDetailPage() {
  return (
    <Suspense fallback={<div className="p-4 text-secondary text-body-md">Chargement...</div>}>
      <EmployeeDetailContent />
    </Suspense>
  )
}
