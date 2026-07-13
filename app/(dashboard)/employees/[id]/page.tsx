'use client'

import { useEffect, useRef, useState } from 'react'
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
  notes: Array<{ id: string; text: string; createdAt: string }> | null
}

const TABS = [
  { id: 'apercu', label: 'Aperçu' },
  { id: 'personnel', label: 'Personnel' },
  { id: 'emploi', label: 'Emploi' },
  { id: 'conges', label: 'Congés' },
  { id: 'temps', label: 'Temps & Présence' },
  { id: 'paie', label: 'Paie' },
  { id: 'documents', label: 'Documents' },
  { id: 'formations', label: 'Formations' },
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

  // Congé modal
  const [showLeave, setShowLeave] = useState(false)
  const [leaveForm, setLeaveForm] = useState({ type: 'Congé annuel', startDate: '', endDate: '', reason: '' })
  const [leaveSaving, setLeaveSaving] = useState(false)
  const [leaveError, setLeaveError] = useState('')

  // Document upload
  const [showDocModal, setShowDocModal] = useState(false)
  const [docForm, setDocForm] = useState({ name: '', type: 'Contrat', category: 'RH', expiryDate: '' })
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docSaving, setDocSaving] = useState(false)
  const [docError, setDocError] = useState('')
  const docFileRef = useRef<HTMLInputElement>(null)

  // Notes
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteError, setNoteError] = useState('')

  // Payroll entries for this employee
  const [payrollEntries, setPayrollEntries] = useState<any[]>([])
  const [payrollLoading, setPayrollLoading] = useState(false)

  // Départ modal
  const [showDepart, setShowDepart] = useState(false)
  const [depart, setDepart] = useState({
    terminationDate: new Date().toISOString().split('T')[0],
    lastWorkDay: new Date().toISOString().split('T')[0],
    reason: '',
    notes: '',
    cancelContracts: true,
  })
  const [departSaving, setDepartSaving] = useState(false)
  const [departError, setDepartError] = useState('')

  const load = () => {
    setLoading(true)
    axios.get(`/api/employees/${id}`)
      .then(r => { setEmployee(r.data); setForm(r.data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  // Load payroll entries when paie tab is selected
  useEffect(() => {
    if (activeTab !== 'paie') return
    setPayrollLoading(true)
    axios.get(`/api/payroll/employee/${id}`)
      .then(r => setPayrollEntries(r.data))
      .catch(() => setPayrollEntries([]))
      .finally(() => setPayrollLoading(false))
  }, [activeTab, id])

  // Auto-activate edit mode if ?edit=true
  useEffect(() => {
    if (searchParams.get('edit') === 'true' && employee) {
      setForm({ ...employee })
      setEditMode(true)
    }
  }, [searchParams, employee])

  const startEdit = () => { setForm({ ...employee }); setEditMode(true) }
  const cancelEdit = () => { setEditMode(false); setSaveError('') }

  const confirmDepart = async () => {
    setDepartSaving(true)
    setDepartError('')
    try {
      // 1. Mark employee INACTIVE
      await axios.put(`/api/employees/${id}`, {
        status: 'INACTIVE',
        probationEndDate: depart.terminationDate,
      })
      // 2. Cancel active contracts if requested
      if (depart.cancelContracts && employee) {
        const activeContracts = employee.contracts.filter((c: any) => c.status === 'ACTIVE')
        await Promise.all(activeContracts.map((c: any) =>
          axios.put(`/api/contracts/${c.id}`, {
            status: 'CANCELLED',
            endDate: depart.terminationDate,
          })
        ))
      }
      setShowDepart(false)
      load()
    } catch (e: any) {
      setDepartError(e.response?.data?.error || 'Erreur lors du traitement du départ')
    } finally {
      setDepartSaving(false)
    }
  }

  const saveNote = async () => {
    if (!noteText.trim()) { setNoteError('La note ne peut pas être vide'); return }
    setNoteSaving(true); setNoteError('')
    try {
      const existing = Array.isArray(employee?.notes) ? employee!.notes : []
      const newNote = { id: `n_${Date.now()}`, text: noteText.trim(), createdAt: new Date().toISOString() }
      await axios.put(`/api/employees/${id}`, { notes: [...existing, newNote] })
      setNoteText('')
      setShowNoteModal(false)
      load()
    } catch (e: any) { setNoteError(e.response?.data?.error || 'Erreur') }
    finally { setNoteSaving(false) }
  }

  const deleteNote = async (noteId: string) => {
    const existing = Array.isArray(employee?.notes) ? employee!.notes : []
    const updated = existing.filter((n: any) => n.id !== noteId)
    await axios.put(`/api/employees/${id}`, { notes: updated })
    load()
  }

  const confirmLeave = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate) { setLeaveError('Dates obligatoires'); return }
    setLeaveSaving(true); setLeaveError('')
    try {
      await axios.post('/api/leaves', { ...leaveForm, employeeId: Number(id) })
      setShowLeave(false)
      setLeaveForm({ type: 'Congé annuel', startDate: '', endDate: '', reason: '' })
      load()
    } catch (e: any) { setLeaveError(e.response?.data?.error || 'Erreur') }
    finally { setLeaveSaving(false) }
  }

  const uploadDoc = async () => {
    if (!docFile) { setDocError('Veuillez sélectionner un fichier'); return }
    if (!docForm.name) { setDocError('Nom du document obligatoire'); return }
    setDocSaving(true); setDocError('')
    try {
      const fd = new FormData()
      fd.append('file', docFile)
      fd.append('employeeId', String(id))
      fd.append('name', docForm.name)
      fd.append('type', docForm.type)
      fd.append('category', docForm.category)
      if (docForm.expiryDate) fd.append('expiryDate', docForm.expiryDate)
      await axios.post('/api/documents', fd)
      setShowDocModal(false)
      setDocForm({ name: '', type: 'Contrat', category: 'RH', expiryDate: '' })
      setDocFile(null)
      load()
    } catch (e: any) { setDocError(e.response?.data?.error || 'Erreur') }
    finally { setDocSaving(false) }
  }

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
            <button onClick={() => { setNoteError(''); setNoteText(''); setShowNoteModal(true) }} className="btn-secondary" style={{ padding: '2px 8px', fontSize: '11px' }}>
              <span className="material-symbols-outlined text-[13px]">add</span>
              Ajouter une note
            </button>
          </div>
          {!employee.notes || (employee.notes as any[]).length === 0 ? (
            <p className="text-body-md text-on-surface-variant text-center py-4">Aucune note pour le moment</p>
          ) : (
            <div className="space-y-2">
              {(employee.notes as any[]).map((n: any) => (
                <div key={n.id} className="flex items-start gap-2 p-2.5 bg-surface-container-lowest rounded-lg border border-outline-variant group">
                  <p className="text-body-md text-on-surface flex-1 whitespace-pre-wrap">{n.text}</p>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <button onClick={() => deleteNote(n.id)} className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded flex items-center justify-center hover:bg-error-container text-secondary hover:text-error">
                      <span className="material-symbols-outlined text-[13px]">delete</span>
                    </button>
                    <p className="text-caption text-secondary">{new Date(n.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
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
  const usedDays = approvedDays
  const remainingDays = Math.max(0, totalAllowance - usedDays)
  const leaveProgress = totalAllowance > 0 ? Math.min(100, Math.round((usedDays / totalAllowance) * 100)) : 0
  const LEAVE_STATUS: Record<string, { label: string; cls: string }> = {
    APPROVED: { label: 'Approuvé', cls: 'bg-tertiary/10 text-tertiary' },
    REJECTED: { label: 'Refusé', cls: 'bg-error/10 text-error' },
    PENDING: { label: 'En attente', cls: 'bg-warning/10 text-warning' },
    CANCELLED: { label: 'Annulé', cls: 'bg-surface-container text-secondary border border-outline-variant' },
  }
  const congesTab = (
    <div className="space-y-4">
      {/* Soldes */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: 'check_circle', label: 'Jours utilisés', value: usedDays, color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
          { icon: 'event_available', label: 'Jours restants', value: remainingDays, color: 'text-tertiary', bg: 'bg-tertiary/5 border-tertiary/20' },
          { icon: 'pending', label: 'En attente', value: pendingCount, color: 'text-warning', bg: 'bg-warning/5 border-warning/20' },
        ].map(card => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`material-symbols-outlined text-[16px] ${card.color}`}>{card.icon}</span>
              <p className="text-caption text-secondary">{card.label}</p>
            </div>
            <p className={`text-[28px] font-bold leading-none ${card.color}`}>{card.value}</p>
            <p className="text-caption text-secondary mt-1">jours</p>
          </div>
        ))}
      </div>

      {/* Barre de progression */}
      {totalAllowance > 0 && (
        <div className="bg-surface rounded-xl border border-outline-variant p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-body-md font-medium text-on-surface">Congés annuels</span>
            <span className="text-body-md text-secondary">{usedDays} / {totalAllowance} jours</span>
          </div>
          <div className="h-2 bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${leaveProgress}%` }} />
          </div>
          <p className="text-caption text-secondary mt-1">{leaveProgress}% du solde annuel utilisé</p>
        </div>
      )}

      {/* Historique */}
      <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <h3 className="text-body-md font-semibold text-on-surface">Historique des congés</h3>
          <button onClick={() => { setLeaveError(''); setShowLeave(true) }} className="btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }}>
            <span className="material-symbols-outlined text-[13px]">add</span>
            Nouveau congé
          </button>
        </div>
        {employee.leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[22px] text-on-surface-variant">beach_access</span>
            </div>
            <p className="text-body-md font-medium text-on-surface">Aucun congé enregistré</p>
            <p className="text-caption text-secondary mt-1">Les demandes de congé apparaîtront ici</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {employee.leaves.map(l => {
              const days = Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1
              const st = LEAVE_STATUS[l.status] ?? { label: l.status, cls: 'bg-surface-container text-secondary' }
              return (
                <div key={l.id} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-container-lowest transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[16px] text-primary">beach_access</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-semibold text-on-surface">{l.type}</p>
                    <p className="text-caption text-secondary">
                      {new Date(l.startDate).toLocaleDateString('fr-FR')} → {new Date(l.endDate).toLocaleDateString('fr-FR')}
                      <span className="ml-2 font-medium text-on-surface-variant">{days}j</span>
                    </p>
                  </div>
                  <span className={`text-caption px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${st.cls}`}>{st.label}</span>
                </div>
              )
            })}
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
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface rounded-xl border border-outline-variant p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[15px] text-primary">schedule</span>
            </div>
            <p className="text-caption text-secondary">Heures ce mois</p>
          </div>
          <p className="text-[28px] font-bold text-on-surface leading-none">{totalHours}<span className="text-title-sm font-normal text-secondary ml-1">h</span></p>
          <div className="mt-2 h-1.5 bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, Math.round((totalHours / (workingDays * 8)) * 100))}%` }} />
          </div>
          <p className="text-caption text-secondary mt-1">sur {workingDays * 8}h prévues</p>
        </div>
        <div className={`bg-surface rounded-xl border p-4 ${attendanceRate < 80 ? 'border-warning/50' : 'border-outline-variant'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${attendanceRate < 80 ? 'bg-warning/10' : 'bg-tertiary/10'}`}>
              <span className={`material-symbols-outlined text-[15px] ${attendanceRate < 80 ? 'text-warning' : 'text-tertiary'}`}>fingerprint</span>
            </div>
            <p className="text-caption text-secondary">Taux de présence</p>
          </div>
          <p className={`text-[28px] font-bold leading-none ${attendanceRate < 80 ? 'text-warning' : 'text-tertiary'}`}>{attendanceRate}<span className="text-title-sm font-normal ml-0.5">%</span></p>
          <div className="mt-2 h-1.5 bg-surface-container rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${attendanceRate < 80 ? 'bg-warning' : 'bg-tertiary'}`} style={{ width: `${attendanceRate}%` }} />
          </div>
          <p className={`text-caption mt-1 ${attendanceRate < 80 ? 'text-warning' : 'text-secondary'}`}>{attendanceRate < 80 ? 'Sous l\'objectif (80%)' : 'Objectif atteint'}</p>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[15px] text-on-surface-variant">event_available</span>
            </div>
            <p className="text-caption text-secondary">Jours présents</p>
          </div>
          <p className="text-[28px] font-bold text-on-surface leading-none">{presentDays}<span className="text-title-sm font-normal text-secondary ml-1">j</span></p>
          <div className="mt-2 h-1.5 bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-on-surface-variant rounded-full" style={{ width: `${Math.min(100, Math.round((presentDays / workingDays) * 100))}%` }} />
          </div>
          <p className="text-caption text-secondary mt-1">sur {workingDays} jours ouvrés</p>
        </div>
      </div>

      {/* Historique mensuel */}
      <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
        <div className="px-4 py-3 border-b border-outline-variant">
          <h3 className="text-body-md font-semibold text-on-surface">Historique de présence</h3>
          <p className="text-caption text-secondary mt-0.5">12 derniers mois</p>
        </div>
        {employee.attendances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[22px] text-on-surface-variant">fingerprint</span>
            </div>
            <p className="text-body-md font-medium text-on-surface">Aucune donnée de présence</p>
            <p className="text-caption text-secondary mt-1">Les pointages apparaîtront ici</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {last12.map(month => {
              const entries = byMonth[month] || []
              const p = entries.filter(a => !a.absence).length
              const h = entries.reduce((acc, a) => acc + (a.overtime || 0), 0)
              const r = entries.length > 0 ? Math.round((p / entries.length) * 100) : 0
              return (
                <div key={month} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-container-lowest transition-colors">
                  <p className="text-body-md capitalize text-on-surface w-28 flex-shrink-0">{month}</p>
                  <div className="flex-1">
                    <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${r < 80 && r > 0 ? 'bg-warning' : 'bg-tertiary'}`} style={{ width: `${r}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-caption text-secondary w-36 flex-shrink-0 justify-end">
                    <span>{entries.length}j</span>
                    <span>{h}h sup.</span>
                    <span className={`font-medium w-8 text-right ${r > 0 && r < 80 ? 'text-warning' : r === 0 ? 'text-secondary' : 'text-tertiary'}`}>{r}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  // ── PAIE ────────────────────────────────────────────────────────────────────
  const empBase = employee.baseSalary || 0
  const empTransport = employee.transportAllowance || 0
  const empHousing = employee.housingAllowance || 0
  const empPositionAl = employee.positionAllowance || 0
  const empGross = empBase + empTransport + empHousing + empPositionAl
  const empCnss = Math.round(empGross * 0.032 * 100) / 100
  const empTaxable = empGross - empCnss
  let empIrpp = 0
  if (empTaxable > 600000) empIrpp = empTaxable * 0.25
  else if (empTaxable > 300000) empIrpp = empTaxable * 0.20
  else if (empTaxable > 150000) empIrpp = empTaxable * 0.15
  else if (empTaxable > 75000) empIrpp = empTaxable * 0.10
  empIrpp = Math.round(empIrpp * 100) / 100
  const empNet = Math.round((empGross - empCnss - empIrpp) * 100) / 100
  const fmtXOF = (v: number) => v.toLocaleString('fr-FR') + ' FCFA'
  const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
  const statusCycleCls: Record<string, string> = {
    DRAFT: 'bg-surface-container text-secondary border border-outline-variant',
    PROCESSED: 'bg-primary/10 text-primary',
    PAID: 'bg-tertiary/10 text-tertiary',
  }
  const statusCycleLbl: Record<string, string> = { DRAFT: 'Brouillon', PROCESSED: 'Traité', PAID: 'Payé' }

  const paieTab = (
    <div className="space-y-4">
      {/* Fiche de rémunération */}
      <div className="bg-surface rounded-xl border border-outline-variant p-5">
        <h3 className="text-label-md font-semibold text-primary uppercase tracking-wide mb-4">Fiche de rémunération</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div><Lbl>CNSS</Lbl><input value={String(val('socialSecurityNumber'))} onChange={set('socialSecurityNumber')} disabled={!editMode} placeholder="Numéro CNSS" className={ic(!editMode)} /></div>
          <div><Lbl>NIF (Tax ID)</Lbl><input value={String(val('taxId'))} onChange={set('taxId')} disabled={!editMode} placeholder="ex. 1000XXXXXX" className={ic(!editMode)} /></div>
          <div><Lbl>Banque</Lbl><input value={String(val('bankName'))} onChange={set('bankName')} disabled={!editMode} className={ic(!editMode)} /></div>
          <div><Lbl>Numéro de compte</Lbl><input value={String(val('accountNumber'))} onChange={set('accountNumber')} disabled={!editMode} className={ic(!editMode)} /></div>
        </div>

        <div className="border-t border-outline-variant pt-4 mt-2">
          <h4 className="text-label-sm text-secondary uppercase tracking-wide mb-3">Composantes salariales</h4>
          {editMode ? (
            <div className="grid grid-cols-2 gap-4">
              <div><Lbl>Salaire de base (FCFA)</Lbl><input type="number" value={form.baseSalary ?? ''} onChange={set('baseSalary')} className={ic(false)} /></div>
              <div><Lbl>Indemnité transport (FCFA)</Lbl><input type="number" value={form.transportAllowance ?? ''} onChange={set('transportAllowance')} className={ic(false)} /></div>
              <div><Lbl>Indemnité logement (FCFA)</Lbl><input type="number" value={form.housingAllowance ?? ''} onChange={set('housingAllowance')} className={ic(false)} /></div>
              <div><Lbl>Indemnité de poste (FCFA)</Lbl><input type="number" value={form.positionAllowance ?? ''} onChange={set('positionAllowance')} className={ic(false)} /></div>
            </div>
          ) : (
            <div className="space-y-0">
              {[
                { label: 'Salaire de base', value: empBase },
                { label: 'Indemnité transport', value: empTransport },
                { label: 'Indemnité logement', value: empHousing },
                { label: 'Indemnité de poste', value: empPositionAl },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-outline-variant last:border-0">
                  <span className="text-body-md text-on-surface-variant">{row.label}</span>
                  <span className="text-body-md font-medium text-on-surface">{fmtXOF(row.value)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2 border-b border-outline-variant">
                <span className="text-body-md font-semibold text-on-surface">Salaire brut</span>
                <span className="text-body-md font-bold text-on-surface">{fmtXOF(empGross)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-outline-variant">
                <span className="text-body-md text-warning">CNSS (3.2%)</span>
                <span className="text-body-md text-warning">− {fmtXOF(empCnss)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-outline-variant">
                <span className="text-body-md text-error">IRPP</span>
                <span className="text-body-md text-error">− {fmtXOF(empIrpp)}</span>
              </div>
              <div className="flex items-center justify-between py-2 bg-primary/5 rounded-lg px-3 mt-1">
                <span className="text-body-md font-bold text-primary">Salaire net</span>
                <span className="text-title-sm font-bold text-primary">{fmtXOF(empNet)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historique des bulletins */}
      <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant">
          <h3 className="text-body-md font-semibold">Historique des bulletins de paie</h3>
          <button onClick={() => router.push('/payroll')} className="text-label-md text-primary hover:underline flex items-center gap-1">
            Gérer les cycles
            <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
          </button>
        </div>
        {payrollLoading ? (
          <div className="p-6 flex justify-center">
            <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : payrollEntries.length === 0 ? (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-[32px] text-on-surface-variant">receipt_long</span>
            <p className="text-body-md text-on-surface-variant mt-2">Aucun bulletin de paie pour cet employé.</p>
            <p className="text-caption text-secondary mt-1">Les bulletins apparaissent ici une fois le cycle de paie créé.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-lowest">
                  <th className="text-left px-4 py-2 text-label-md font-semibold text-on-surface-variant uppercase">Période</th>
                  <th className="text-left px-4 py-2 text-label-md font-semibold text-on-surface-variant uppercase">Statut</th>
                  <th className="text-right px-4 py-2 text-label-md font-semibold text-on-surface-variant uppercase">Brut</th>
                  <th className="text-right px-4 py-2 text-label-md font-semibold text-on-surface-variant uppercase">CNSS</th>
                  <th className="text-right px-4 py-2 text-label-md font-semibold text-on-surface-variant uppercase">IRPP</th>
                  <th className="text-right px-4 py-2 text-label-md font-semibold text-on-surface-variant uppercase">Net</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {payrollEntries.map((e: any) => (
                  <tr key={e.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-4 py-2.5 text-body-md font-medium capitalize">
                      {e.cycle ? `${MONTHS_FR[e.cycle.month - 1]} ${e.cycle.year}` : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {e.cycle && (
                        <span className={`text-caption px-2 py-0.5 rounded-full ${statusCycleCls[e.cycle.status] || ''}`}>
                          {statusCycleLbl[e.cycle.status] || e.cycle.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-body-md">{fmtXOF(e.gross || 0)}</td>
                    <td className="px-4 py-2.5 text-right text-body-md text-warning">{fmtXOF(e.cnss || 0)}</td>
                    <td className="px-4 py-2.5 text-right text-body-md text-error">{fmtXOF(e.tax || 0)}</td>
                    <td className="px-4 py-2.5 text-right text-body-md font-bold text-tertiary">{fmtXOF(e.net || 0)}</td>
                    <td className="px-4 py-2.5 text-center">
                      {e.cycle && (
                        <button onClick={() => router.push(`/payroll/${e.cycle.id}`)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surface-container text-secondary" title="Voir le cycle">
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
            : employee.contracts.map(c => {
              const statusCls = c.status === 'ACTIVE' ? 'bg-tertiary/10 text-tertiary' : c.status === 'CANCELLED' ? 'bg-error/10 text-error' : 'bg-surface-container text-secondary border border-outline-variant'
              const statusLbl = c.status === 'ACTIVE' ? 'Actif' : c.status === 'CANCELLED' ? 'Annulé' : c.status === 'EXPIRED' ? 'Expiré' : 'Brouillon'
              return (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-lg border border-outline-variant">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">description</span>
                  <div className="flex-1">
                    <p className="text-body-md font-medium">{c.type === 'CDI' ? 'Durée indéterminée' : c.type} · {c.contractNo}</p>
                    <p className="text-caption text-secondary">
                      {new Date(c.startDate).toLocaleDateString('fr-FR')} — {c.endDate ? new Date(c.endDate).toLocaleDateString('fr-FR') : '—'}
                    </p>
                  </div>
                  <span className={`text-caption px-2 py-0.5 rounded-full ${statusCls}`}>{statusLbl}</span>
                  <button onClick={() => router.push(`/contracts/${c.id}/view`)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surface-container text-secondary" title="Voir">
                    <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                  </button>
                </div>
              )
            })
          }
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant">
          <h3 className="text-body-md font-semibold">Documents</h3>
          <button onClick={() => { setDocError(''); setShowDocModal(true) }} className="btn-secondary" style={{ padding: '2px 8px', fontSize: '11px' }}>
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

  // ── FORMATIONS ───────────────────────────────────────────────────────────────
  const formationsTab = (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Formations suivies', value: employee.trainings.length, icon: 'school', color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Certifiées', value: employee.trainings.filter(t => t.certificate).length, icon: 'verified', color: 'text-tertiary', bg: 'bg-tertiary/10' },
          { label: 'Cette année', value: employee.trainings.filter(t => new Date(t.date).getFullYear() === new Date().getFullYear()).length, icon: 'calendar_today', color: 'text-secondary', bg: 'bg-surface-container' },
        ].map(card => (
          <div key={card.label} className="bg-surface rounded-xl border border-outline-variant p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${card.bg}`}>
              <span className={`material-symbols-outlined text-[20px] ${card.color}`}>{card.icon}</span>
            </div>
            <div>
              <p className="text-[24px] font-bold text-on-surface leading-none">{card.value}</p>
              <p className="text-caption text-secondary mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Liste */}
      <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
        <div className="px-4 py-3 border-b border-outline-variant">
          <h3 className="text-body-md font-semibold text-on-surface">Historique des formations</h3>
        </div>
        {employee.trainings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[22px] text-on-surface-variant">school</span>
            </div>
            <p className="text-body-md font-medium text-on-surface">Aucune formation enregistrée</p>
            <p className="text-caption text-secondary mt-1">Les formations de cet employé apparaîtront ici</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {employee.trainings.map(t => (
              <div key={t.id} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-container-lowest transition-colors">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[16px] text-primary">school</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-semibold text-on-surface truncate">{t.title}</p>
                  <p className="text-caption text-secondary">{t.organization} · {new Date(t.date).toLocaleDateString('fr-FR')}</p>
                </div>
                {t.certificate && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-tertiary/10 flex-shrink-0">
                    <span className="material-symbols-outlined text-[12px] text-tertiary">verified</span>
                    <span className="text-caption text-tertiary font-medium">Certifié</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
    formations: formationsTab,
  }

  return (
    <>
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
            {employee.status === 'ACTIVE' && (
              <button
                onClick={() => { setDepartError(''); setShowDepart(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-md border border-error text-error hover:bg-error-container transition-all flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[13px]">exit_to_app</span>
                Départ de l'employé
              </button>
            )}
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

    {/* ── Modal Note ──────────────────────────────────────────────────────── */}
    {showNoteModal && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-surface rounded-2xl shadow-level-3 w-full max-w-sm">
          <div className="flex items-center justify-between p-5 border-b border-outline-variant">
            <h2 className="text-title-md font-semibold text-on-surface">Ajouter une note</h2>
            <button onClick={() => setShowNoteModal(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surface-container">
              <span className="material-symbols-outlined text-[18px] text-secondary">close</span>
            </button>
          </div>
          <div className="p-5">
            {noteError && <div className="bg-error-container text-on-error-container p-3 rounded-lg text-body-md mb-3">{noteError}</div>}
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              autoFocus
              rows={4}
              placeholder="Saisissez votre note..."
              className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 px-5 py-4 border-t border-outline-variant">
            <button onClick={() => setShowNoteModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={saveNote} disabled={noteSaving} className="btn-primary flex items-center gap-2">
              {noteSaving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Modal Congé ─────────────────────────────────────────────────────── */}
    {showLeave && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-surface rounded-2xl shadow-level-3 w-full max-w-md">
          <div className="flex items-center justify-between p-5 border-b border-outline-variant">
            <h2 className="text-title-md font-semibold text-on-surface">Enregistrer un congé</h2>
            <button onClick={() => setShowLeave(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surface-container">
              <span className="material-symbols-outlined text-[18px] text-secondary">close</span>
            </button>
          </div>
          <div className="p-5 space-y-4">
            {leaveError && <div className="bg-error-container text-on-error-container p-3 rounded-lg text-body-md">{leaveError}</div>}
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1.5">Type de congé</label>
              <select value={leaveForm.type} onChange={e => setLeaveForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option>Congé annuel</option>
                <option>Congé maladie</option>
                <option>Congé maternité</option>
                <option>Congé paternité</option>
                <option>Congé sans solde</option>
                <option>Autre</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1.5">Date de début *</label>
                <input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))} className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1.5">Date de fin *</label>
                <input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm(f => ({ ...f, endDate: e.target.value }))} className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1.5">Motif</label>
              <textarea value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} rows={2} placeholder="Motif du congé..." className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 px-5 py-4 border-t border-outline-variant">
            <button onClick={() => setShowLeave(false)} className="btn-secondary">Annuler</button>
            <button onClick={confirmLeave} disabled={leaveSaving} className="btn-primary">
              {leaveSaving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Modal Document ───────────────────────────────────────────────────── */}
    {showDocModal && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-surface rounded-2xl shadow-level-3 w-full max-w-md">
          <div className="flex items-center justify-between p-5 border-b border-outline-variant">
            <h2 className="text-title-md font-semibold text-on-surface">Téléverser un document</h2>
            <button onClick={() => setShowDocModal(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surface-container">
              <span className="material-symbols-outlined text-[18px] text-secondary">close</span>
            </button>
          </div>
          <div className="p-5 space-y-4">
            {docError && <div className="bg-error-container text-on-error-container p-3 rounded-lg text-body-md">{docError}</div>}
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1.5">Fichier *</label>
              <input ref={docFileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e => setDocFile(e.target.files?.[0] ?? null)} className="w-full text-body-md file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary-container file:text-on-primary-container file:text-label-md cursor-pointer" />
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1.5">Nom du document *</label>
              <input value={docForm.name} onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} placeholder="ex. Contrat CDI signé" className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1.5">Type</label>
                <select value={docForm.type} onChange={e => setDocForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option>Contrat</option><option>Pièce d'identité</option><option>Diplôme</option><option>Attestation</option><option>Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1.5">Catégorie</label>
                <select value={docForm.category} onChange={e => setDocForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option>RH</option><option>Administratif</option><option>Formation</option><option>Médical</option><option>Autre</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1.5">Date d'expiration</label>
              <input type="date" value={docForm.expiryDate} onChange={e => setDocForm(f => ({ ...f, expiryDate: e.target.value }))} className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="flex justify-end gap-3 px-5 py-4 border-t border-outline-variant">
            <button onClick={() => setShowDocModal(false)} className="btn-secondary">Annuler</button>
            <button onClick={uploadDoc} disabled={docSaving} className="btn-primary flex items-center gap-2">
              {docSaving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Téléverser
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Modal Départ ────────────────────────────────────────────────────── */}
    {showDepart && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-surface rounded-2xl shadow-level-3 w-full max-w-md">
          <div className="flex items-start justify-between p-5 border-b border-outline-variant">
            <div>
              <h2 className="text-title-md font-semibold text-on-surface">Départ de l'employé</h2>
              <p className="text-caption text-secondary mt-0.5">
                Ceci marquera l'employé comme ancien employé, désactivera son compte et résiliera optionnellement tous les contrats actifs.
              </p>
            </div>
            <button onClick={() => setShowDepart(false)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surface-container ml-3 flex-shrink-0">
              <span className="material-symbols-outlined text-[18px] text-secondary">close</span>
            </button>
          </div>

          <div className="p-5 space-y-4">
            {departError && (
              <div className="bg-error-container text-on-error-container p-3 rounded-lg text-body-md">{departError}</div>
            )}

            <div>
              <label className="block text-label-md text-on-surface-variant mb-1.5">Date de résiliation *</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-secondary">calendar_today</span>
                <input
                  type="date"
                  value={depart.terminationDate}
                  onChange={e => setDepart(d => ({ ...d, terminationDate: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-label-md text-on-surface-variant mb-1.5">Dernier jour de travail</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-secondary">calendar_today</span>
                <input
                  type="date"
                  value={depart.lastWorkDay}
                  onChange={e => setDepart(d => ({ ...d, lastWorkDay: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-label-md text-on-surface-variant mb-1.5">Motif</label>
              <select
                value={depart.reason}
                onChange={e => setDepart(d => ({ ...d, reason: e.target.value }))}
                className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Sélectionner le motif</option>
                <option value="Démission">Démission</option>
                <option value="Licenciement économique">Licenciement économique</option>
                <option value="Licenciement pour faute">Licenciement pour faute</option>
                <option value="Fin de contrat CDD">Fin de contrat CDD</option>
                <option value="Retraite">Retraite</option>
                <option value="Rupture conventionnelle">Rupture conventionnelle</option>
                <option value="Décès">Décès</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-label-md text-on-surface-variant mb-1.5">Notes</label>
              <textarea
                value={depart.notes}
                onChange={e => setDepart(d => ({ ...d, notes: e.target.value }))}
                placeholder="Notes supplémentaires sur le départ..."
                rows={3}
                className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <label className="flex items-center justify-between p-3 border border-outline-variant rounded-lg cursor-pointer hover:bg-surface-container transition-colors">
              <span className="text-body-md text-on-surface">
                Résilier aussi tous les contrats actifs ({employee.contracts.filter((c: any) => c.status === 'ACTIVE').length} actif(s))
              </span>
              <button
                type="button"
                onClick={() => setDepart(d => ({ ...d, cancelContracts: !d.cancelContracts }))}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${depart.cancelContracts ? 'bg-primary' : 'bg-outline-variant'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${depart.cancelContracts ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </label>
          </div>

          <div className="flex justify-end gap-3 px-5 py-4 border-t border-outline-variant">
            <button onClick={() => setShowDepart(false)} className="btn-secondary">Annuler</button>
            <button
              onClick={confirmDepart}
              disabled={departSaving || !depart.terminationDate}
              className="flex items-center gap-2 px-4 py-2 bg-error text-on-error rounded-lg text-label-md font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {departSaving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Confirmer le départ
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

export default function EmployeeDetailPage() {
  return (
    <Suspense fallback={<div className="p-4 text-secondary text-body-md">Chargement...</div>}>
      <EmployeeDetailContent />
    </Suspense>
  )
}
