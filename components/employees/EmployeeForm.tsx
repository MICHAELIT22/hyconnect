'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface EmployeeFormData {
  id?: number
  matricule: string
  firstName: string
  lastName: string
  sex: string
  nationality: string
  birthDate: string
  birthPlace: string
  maritalStatus: string
  childrenCount: number
  address: string
  city: string
  country: string
  phone1: string
  phone2: string
  email: string
  hireDate: string
  position: string
  department: string
  service: string
  manager: string
  category: string
  status: string
  employmentType: string
  workLocation: string
  probationEndDate: string
  baseSalary: number | ''
  transportAllowance: number | ''
  housingAllowance: number | ''
  positionAllowance: number | ''
  bankName: string
  accountNumber: string
  iban: string
  swift: string
  nationalId: string
  socialSecurityNumber: string
  passportNumber: string
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactRelation: string
  photoPath: string
  sendInvite: boolean
  contractType: string
  contractStartDate: string
  contractEndDate: string
  trialPeriod: string
  workerCategory: string
  annualLeaveDays: number
  currency: string
  language: string
}

const empty: EmployeeFormData = {
  matricule: '', firstName: '', lastName: '', sex: 'M', nationality: 'Togolaise',
  birthDate: '', birthPlace: '', maritalStatus: 'Célibataire', childrenCount: 0,
  address: '', city: '', country: 'Togo', phone1: '+228', phone2: '', email: '',
  hireDate: '', position: '', department: '', service: '', manager: '',
  category: '', status: 'ACTIVE',
  employmentType: '', workLocation: '', probationEndDate: '',
  baseSalary: '', transportAllowance: '', housingAllowance: '', positionAllowance: '',
  bankName: '', accountNumber: '', iban: '', swift: '',
  nationalId: '', socialSecurityNumber: '', passportNumber: '',
  emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
  photoPath: '',
  sendInvite: true,
  contractType: 'CDI',
  contractStartDate: new Date().toISOString().split('T')[0],
  contractEndDate: '',
  trialPeriod: '90',
  workerCategory: 'Mensuel',
  annualLeaveDays: 21,
  currency: 'XOF',
  language: 'Français',
}

const COUNTRIES = [
  'Togo', 'Bénin', 'Ghana', 'Côte d\'Ivoire', 'Sénégal', 'Mali', 'Burkina Faso',
  'Niger', 'Cameroun', 'Nigeria', 'France', 'Autre',
]

const CONTRACT_TYPES = [
  { value: 'CDI', label: 'Durée indéterminée' },
  { value: 'CDD', label: 'Durée déterminée' },
  { value: 'Stage', label: 'Stage' },
  { value: 'Consultant', label: 'Consultant' },
]

const TRIAL_PERIODS = [
  { value: '0', label: 'Pas de période d\'essai' },
  { value: '30', label: '30 jours (1 mois)' },
  { value: '60', label: '60 jours (2 mois)' },
  { value: '90', label: '90 jours (3 mois)' },
  { value: '180', label: '180 jours (6 mois)' },
]

const WORKER_CATEGORIES = ['Mensuel', 'Journalier', 'Horaire']

interface Props {
  employee?: any
  onClose: () => void
  onSuccess: () => void
  mode?: 'modal' | 'page'
}

function StepIndicator({ step, total, labels }: { step: number; total: number; labels: string[] }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-body-md font-semibold border-2 transition-all ${
            i < step
              ? 'bg-primary border-primary text-on-primary'
              : i === step
                ? 'bg-primary border-primary text-on-primary'
                : 'bg-surface border-outline-variant text-secondary'
          }`}>
            {i < step ? (
              <span className="material-symbols-outlined text-[14px]">check</span>
            ) : (
              i + 1
            )}
          </div>
          {i < total - 1 && (
            <div className={`w-16 h-0.5 mx-1 ${i < step ? 'bg-primary' : 'bg-outline-variant'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="text-body-md font-medium text-on-surface block mb-1">
        {label}{required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-caption text-secondary mt-0.5">{hint}</p>}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 border border-outline-variant rounded-lg text-body-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors'
const selectCls = inputCls

export default function EmployeeForm({ employee, onClose, onSuccess, mode = 'modal' }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<EmployeeFormData>({ ...empty })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const stepLabels = ['Personnel', 'Emploi', 'Contrat', 'Vérification']
  const isEdit = !!employee?.id

  useEffect(() => {
    if (employee) {
      setForm({
        ...empty,
        ...employee,
        birthDate: employee.birthDate?.split('T')[0] || '',
        hireDate: employee.hireDate?.split('T')[0] || '',
        probationEndDate: employee.probationEndDate?.split('T')[0] || '',
      })
    } else {
      // Auto-generate matricule
      const num = Math.floor(Math.random() * 900) + 100
      setForm(f => ({ ...f, matricule: `EMP${String(num).padStart(3, '0')}` }))
    }
  }, [employee])

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    const nums = ['childrenCount', 'baseSalary', 'transportAllowance', 'housingAllowance', 'positionAllowance', 'annualLeaveDays']
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox' ? checked : nums.includes(name) ? (value === '' ? '' : Number(value)) : value,
    }))
  }

  const regenMatricule = () => {
    const num = Math.floor(Math.random() * 900) + 100
    setForm(f => ({ ...f, matricule: `EMP${String(num).padStart(3, '0')}` }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const payload = {
        ...form,
        baseSalary: form.baseSalary === '' ? 0 : form.baseSalary,
        transportAllowance: form.transportAllowance === '' ? 0 : form.transportAllowance,
        housingAllowance: form.housingAllowance === '' ? 0 : form.housingAllowance,
        positionAllowance: form.positionAllowance === '' ? 0 : form.positionAllowance,
      }
      if (isEdit) {
        await axios.put(`/api/employees/${form.id}`, payload)
      } else {
        const res = await axios.post('/api/employees', payload)
        // Create contract for new employee
        if (form.contractType && form.contractStartDate) {
          const empId = res.data.id
          const contractNo = `CTR-${empId}-${Date.now().toString().slice(-6)}`
          await axios.post('/api/contracts', {
            employeeId: empId,
            contractNo,
            type: form.contractType,
            position: form.position || '—',
            department: form.department || '—',
            salary: form.baseSalary === '' ? 0 : Number(form.baseSalary),
            status: 'ACTIVE',
            startDate: form.contractStartDate,
            endDate: form.contractEndDate || null,
            trialEndDate: form.trialPeriod !== '0' && form.contractStartDate
              ? new Date(new Date(form.contractStartDate).getTime() + parseInt(form.trialPeriod) * 86400000).toISOString().split('T')[0]
              : null,
            workerCategory: form.workerCategory,
            annualLeaveDays: form.annualLeaveDays,
            currency: form.currency,
          }).catch(() => {})
        }
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || "Erreur lors de l'enregistrement")
      setLoading(false)
    }
  }

  // ── Step 0 : Personnel ──────────────────────────────────────────
  const stepPersonnel = (
    <div>
      <h2 className="text-headline-md font-semibold text-on-surface mb-0.5">Personnel</h2>
      <p className="text-body-md text-secondary mb-5">Informations personnelles de base du nouvel employé</p>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Prénom" required>
          <input name="firstName" value={form.firstName} onChange={set} placeholder="Ex: Ama" className={inputCls} required />
        </Field>
        <Field label="Nom" required>
          <input name="lastName" value={form.lastName} onChange={set} placeholder="Ex: Mensah" className={inputCls} required />
        </Field>
        <Field label="Email" required>
          <input type="email" name="email" value={form.email} onChange={set} placeholder="nom@entreprise.com" className={inputCls} required />
        </Field>

        {/* Sexe — boutons radio visuels */}
        <Field label="Sexe" required>
          <div className="flex gap-2 mt-0.5">
            {[
              { value: 'M', label: 'Masculin', icon: 'male' },
              { value: 'F', label: 'Féminin', icon: 'female' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, sex: opt.value }))}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border-2 text-body-md font-medium transition-all ${
                  form.sex === opt.value
                    ? 'border-primary bg-primary-container text-on-primary-container'
                    : 'border-outline-variant bg-surface text-secondary hover:border-outline hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Téléphone">
          <input name="phone1" value={form.phone1} onChange={set} placeholder="+228" className={inputCls} />
        </Field>
        <Field label="Date de naissance">
          <input type="date" name="birthDate" value={form.birthDate} onChange={set} className={inputCls} />
        </Field>
        <Field label="Nationalité">
          <select name="nationality" value={form.nationality} onChange={set} className={selectCls}>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <div className="col-span-3">
          <Field label="Identifiant employé">
            <div className="flex gap-2">
              <input name="matricule" value={form.matricule} onChange={set} className={`${inputCls} flex-1`} />
              <button type="button" onClick={regenMatricule}
                className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors text-secondary">
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
            </div>
          </Field>
        </div>
      </div>
    </div>
  )

  // ── Step 1 : Emploi ─────────────────────────────────────────────
  const stepEmploi = (
    <div>
      <h2 className="text-headline-md font-semibold text-on-surface mb-0.5">Emploi</h2>
      <p className="text-body-md text-secondary mb-5">Poste, département et hiérarchie</p>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Pays de travail" hint="À renseigner uniquement si différent du pays de l'entreprise (employé expatrié)">
          <select name="country" value={form.country} onChange={set} className={selectCls}>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Département">
          <input name="department" value={form.department} onChange={set} placeholder="Ex: Comptabilité" className={inputCls} />
        </Field>
        <Field label="Succursale">
          <input name="workLocation" value={form.workLocation} onChange={set} placeholder="Ex: Siège Lomé" className={inputCls} />
        </Field>
        <Field label="Poste" required>
          <input name="position" value={form.position} onChange={set} placeholder="Ex: Ingénieur logiciel" className={inputCls} required />
        </Field>
        <Field label="Supérieur hiérarchique" hint="Optionnel — relier à un responsable direct">
          <input name="manager" value={form.manager} onChange={set} placeholder="—" className={inputCls} />
        </Field>
        <Field label="Date d'embauche" required>
          <input type="date" name="hireDate" value={form.hireDate} onChange={set} className={inputCls} required />
        </Field>
        <Field label="CIN / Pièce d'identité">
          <input name="nationalId" value={form.nationalId} onChange={set} placeholder="Numéro CIN" className={inputCls} />
        </Field>
        <Field label="N° CNSS">
          <input name="socialSecurityNumber" value={form.socialSecurityNumber} onChange={set} placeholder="Numéro sécurité sociale" className={inputCls} />
        </Field>
        <Field label="N° Passeport">
          <input name="passportNumber" value={form.passportNumber} onChange={set} placeholder="Numéro passeport" className={inputCls} />
        </Field>
        <Field label="Situation familiale" hint="Détermine la déduction IRPP">
          <select name="maritalStatus" value={form.maritalStatus} onChange={set} className={selectCls}>
            <option>Célibataire</option>
            <option>Marié(e)</option>
            <option>Divorcé(e)</option>
            <option>Veuf(ve)</option>
          </select>
        </Field>
        <Field label="Enfants à charge" hint="Enfants à charge pour déduction IRPP — moins de 21 ans, ou 25 ans si étudiant">
          <input type="number" name="childrenCount" value={form.childrenCount} onChange={set} min={0} className={inputCls} />
        </Field>
      </div>
    </div>
  )

  // ── Step 2 : Contrat ────────────────────────────────────────────
  const trialDays = parseInt(form.trialPeriod || '0')
  const trialEndDate = trialDays > 0 && form.contractStartDate
    ? new Date(new Date(form.contractStartDate).getTime() + trialDays * 86400000).toLocaleDateString('fr-FR')
    : null

  const isFemale = form.sex === 'F'
  const salarieTxt = isFemale ? 'la Salariée' : 'le Salarié'
  const denomme = isFemale ? 'dénommée' : 'dénommé'
  const ilElle = isFemale ? 'Elle' : 'Il'

  const contractPreview = `Le présent Contrat de Travail (« Contrat ») est conclu et prend effet le ${form.contractStartDate || '___'}, entre :

${form.position || 'L\'Employeur'}, ci-après dénommé « l'Employeur » ;

et

${form.firstName || '___'} ${form.lastName || '___'}, ci-après ${denomme} « ${salarieTxt} » ;

Ci-après collectivement dénommés « les Parties ».`

  const stepContrat = (
    <div className="grid grid-cols-2 gap-0 h-full">
      {/* Left: form */}
      <div className="pr-5 border-r border-outline-variant space-y-4 overflow-y-auto">
        <div>
          <h2 className="text-headline-md font-semibold text-on-surface mb-0.5">Contrat</h2>
          <p className="text-body-md text-secondary mb-4">Définir les termes du contrat, le salaire et les clauses</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type de contrat">
            <select name="contractType" value={form.contractType} onChange={set} className={selectCls}>
              {CONTRACT_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
            </select>
          </Field>
          <Field label="Période d'essai">
            <select name="trialPeriod" value={form.trialPeriod} onChange={set} className={selectCls}>
              {TRIAL_PERIODS.map(tp => <option key={tp.value} value={tp.value}>{tp.label}</option>)}
            </select>
          </Field>
          <Field label="Date de début" required>
            <input type="date" name="contractStartDate" value={form.contractStartDate} onChange={set} className={inputCls} required />
          </Field>
          <Field label="Catégorie de travailleur">
            <select name="workerCategory" value={form.workerCategory} onChange={set} className={selectCls}>
              {WORKER_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <div className="col-span-2">
            <Field label="Jours de congé annuel">
              <input type="number" name="annualLeaveDays" value={form.annualLeaveDays} onChange={set} min={0} className={inputCls} />
            </Field>
          </div>
        </div>

        {/* Rémunération */}
        <div className="border border-outline-variant rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-surface-container-low border-b border-outline-variant">
            <span className="text-body-md font-semibold text-on-surface">Rémunération</span>
          </div>
          <div className="p-3 grid grid-cols-2 gap-3">
            <Field label="Salaire de base">
              <input type="number" name="baseSalary" value={form.baseSalary} onChange={set} placeholder="0.00" className={inputCls} />
            </Field>
            <Field label="Devise">
              <input name="currency" value={form.currency} onChange={set} placeholder="XOF" className={inputCls} />
            </Field>
            <div className="col-span-2">
              <Field label="Langue du contrat">
                <select name="language" value={form.language} onChange={set} className={selectCls}>
                  <option>Français</option>
                  <option>Anglais</option>
                </select>
              </Field>
            </div>
            <Field label="Nom de la banque">
              <input name="bankName" value={form.bankName} onChange={set} className={inputCls} />
            </Field>
            <Field label="Compte bancaire">
              <input name="accountNumber" value={form.accountNumber} onChange={set} className={inputCls} />
            </Field>
          </div>
        </div>
      </div>

      {/* Right: contract preview */}
      <div className="pl-5 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <span className="text-caption text-secondary">Aperçu du contrat — synchronisé avec le formulaire</span>
        </div>
        <div className="flex-1 overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-body-md text-on-surface leading-relaxed space-y-3">
          <p className="text-primary text-body-md leading-relaxed whitespace-pre-line">{contractPreview}</p>
          <div>
            <h3 className="text-title-sm font-bold mt-4 mb-1">Article 1 – Nature et Durée du Contrat</h3>
            <p className="text-primary">Le présent contrat est un <strong>contrat {form.contractType === 'CDI' ? 'à durée indéterminée (CDI)' : form.contractType === 'CDD' ? 'à durée déterminée (CDD)' : form.contractType}</strong>.</p>
            <p className="text-primary mt-1 italic text-caption">Le présent Contrat est régi par le Code du Travail de la République Togolaise (Loi n° 2006-010 du 13 décembre 2006).</p>
          </div>
          <div>
            <h3 className="text-title-sm font-bold mt-4 mb-1">Article 2 – Poste et Fonctions</h3>
            <p className="text-primary">Le Salarié est engagé en qualité de <strong>{form.position || '___'}</strong>, et s'engage à accomplir l'ensemble des tâches et responsabilités liées à ce poste.</p>
          </div>
          <div>
            <h3 className="text-title-sm font-bold mt-4 mb-1">Article 3 – Lieu de Travail</h3>
            <p className="text-primary">Le lieu principal de travail est situé dans les locaux de l'Employeur{form.workLocation ? `, ${form.workLocation}` : ''}, ou en tout autre lieu que l'Employeur pourra raisonnablement désigner.</p>
          </div>
          <div>
            <h3 className="text-title-sm font-bold mt-4 mb-1">Article 4 – Rémunération</h3>
            <p className="text-primary">Le Salarié percevra un salaire brut de <strong>{form.currency} {form.baseSalary || '0.00'}</strong>, payable sur une base mensuelle.</p>
            {trialEndDate && (
              <p className="text-primary mt-1">La période d'essai se termine le <strong>{trialEndDate}</strong>.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // ── Step 3 : Vérification ───────────────────────────────────────
  const stepVerif = (
    <div>
      <h2 className="text-headline-md font-semibold text-on-surface mb-0.5">Vérification & Invitation</h2>
      <p className="text-body-md text-secondary mb-5">Vérifiez les informations ci-dessous, puis créez l'employé</p>

      <div className="space-y-3">
        {/* Personnel */}
        <div className="border border-outline-variant rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container-low border-b border-outline-variant">
            <span className="text-body-md font-semibold">Personnel</span>
            <button type="button" onClick={() => setStep(0)}
              className="flex items-center gap-1 text-caption text-secondary hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[13px]">edit</span> Modifier
            </button>
          </div>
          <div className="px-4 py-3 grid grid-cols-2 gap-y-2 text-body-md">
            <div className="text-secondary">Prénom & Nom</div><div className="text-on-surface">{form.firstName} {form.lastName}</div>
            <div className="text-secondary">Sexe</div>
            <div className="text-on-surface flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-primary">{form.sex === 'F' ? 'female' : 'male'}</span>
              {form.sex === 'F' ? 'Féminin' : 'Masculin'}
            </div>
            <div className="text-secondary">Email</div><div className="text-on-surface">{form.email}</div>
          </div>
        </div>

        {/* Emploi */}
        <div className="border border-outline-variant rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container-low border-b border-outline-variant">
            <span className="text-body-md font-semibold">Emploi</span>
            <button type="button" onClick={() => setStep(1)}
              className="flex items-center gap-1 text-caption text-secondary hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[13px]">edit</span> Modifier
            </button>
          </div>
          <div className="px-4 py-3 grid grid-cols-2 gap-y-2 text-body-md">
            <div className="text-secondary">Poste</div><div className="text-on-surface">{form.position || '—'}</div>
            <div className="text-secondary">Date d'embauche</div><div className="text-on-surface">{form.hireDate || '—'}</div>
            <div className="text-secondary">Département</div><div className="text-on-surface">{form.department || '—'}</div>
            <div className="text-secondary">Catégorie de travailleur</div><div className="text-on-surface">{form.workerCategory}</div>
          </div>
        </div>

        {/* Contrat */}
        <div className="border border-outline-variant rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container-low border-b border-outline-variant">
            <span className="text-body-md font-semibold">Contrat</span>
            <button type="button" onClick={() => setStep(2)}
              className="flex items-center gap-1 text-caption text-secondary hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[13px]">edit</span> Modifier
            </button>
          </div>
          <div className="px-4 py-3 grid grid-cols-2 gap-y-2 text-body-md">
            <div className="text-secondary">Type de contrat</div>
            <div className="text-on-surface">{CONTRACT_TYPES.find(c => c.value === form.contractType)?.label || form.contractType}</div>
            <div className="text-secondary">Date de début</div><div className="text-on-surface">{form.contractStartDate || '—'}</div>
            <div className="text-secondary">Salaire de base</div><div className="text-on-surface">{form.currency} {form.baseSalary || 0}/me</div>
            <div className="text-secondary">Période d'essai</div>
            <div className="text-on-surface">{form.trialPeriod === '0' ? 'Aucune' : `${form.trialPeriod} jours`}</div>
          </div>
        </div>

        {/* Invitation */}
        <div className="border border-outline-variant rounded-lg p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">email</span>
          <div className="flex-1">
            <div className="text-body-md font-semibold text-on-surface">Envoyer un email d'invitation à l'employé</div>
            <div className="text-caption text-secondary">L'employé recevra un lien pour créer son compte sur le portail de l'entreprise. Le lien expire dans 7 jours.</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-2 mt-0.5">
            <input type="checkbox" name="sendInvite" checked={form.sendInvite} onChange={set} className="sr-only peer" />
            <div className="w-10 h-5 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
          </label>
        </div>
      </div>

      {error && (
        <div className="mt-3 bg-error-container text-on-error-container p-3 rounded-lg text-body-md">{error}</div>
      )}
    </div>
  )

  const steps = [stepPersonnel, stepEmploi, stepContrat, stepVerif]

  const isLastStep = step === steps.length - 1
  const isContractStep = step === 2

  const handleNext = () => {
    if (step === 0 && (!form.firstName || !form.lastName || !form.email)) {
      setError('Veuillez remplir les champs obligatoires (Prénom, Nom, Email)')
      return
    }
    if (step === 1 && (!form.position || !form.hireDate)) {
      setError('Veuillez remplir les champs obligatoires (Poste, Date d\'embauche)')
      return
    }
    setError('')
    setStep(s => s + 1)
  }

  const inner = (
    <div className={`flex flex-col ${mode === 'page' ? 'min-h-screen bg-background' : 'h-full'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b border-outline-variant flex-shrink-0 bg-surface ${mode === 'page' ? '' : ''}`}>
        <div>
          <h1 className="text-headline-md font-semibold text-on-surface">
            {isEdit ? "Modifier l'employé" : 'Ajouter un employé'}
          </h1>
          <p className="text-body-md text-secondary">
            {isEdit ? 'Modifier les informations' : 'Ajouter un nouveau membre avec ses détails de contrat'}
          </p>
        </div>
        {mode === 'page' ? (
          <button onClick={onClose} className="btn-secondary">
            <span className="material-symbols-outlined text-[15px]">arrow_back</span>
            Retour
          </button>
        ) : (
          <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-container-high text-secondary">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-6 py-5">
        <div className={`mx-auto ${isContractStep ? 'max-w-5xl' : 'max-w-3xl'}`}>
          <div className="bg-surface rounded-xl border border-outline-variant shadow-level-1 overflow-hidden">
            <div className={`p-6 ${isContractStep ? 'h-[calc(100vh-260px)] flex flex-col' : ''}`}>
              {!isEdit && <StepIndicator step={step} total={steps.length} labels={stepLabels} />}
              <div className={isContractStep ? 'flex-1 overflow-hidden flex flex-col' : ''}>
                {steps[step]}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant bg-surface-container-lowest">
              <button type="button" onClick={onClose} className="text-primary text-body-md hover:underline font-medium">
                Annuler
              </button>
              <div className="flex items-center gap-3">
                {step > 0 && (
                  <button type="button" onClick={() => setStep(s => s - 1)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-outline-variant rounded-lg text-body-md text-secondary hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                    Retour
                  </button>
                )}
                {isLastStep || isEdit ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-5 py-2 bg-primary text-on-primary rounded-lg text-body-md font-semibold hover:bg-primary-fixed-variant disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Enregistrement...' : (isEdit ? 'Enregistrer' : 'Créer l\'employé')}
                    {!loading && !isEdit && <span className="material-symbols-outlined text-[15px]">check</span>}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-1.5 px-5 py-2 bg-primary text-on-primary rounded-lg text-body-md font-semibold hover:bg-primary-fixed-variant transition-colors"
                  >
                    Suivant
                    <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (mode === 'page') return inner

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className={`bg-background rounded-xl shadow-level-3 border border-outline-variant overflow-hidden ${isContractStep ? 'w-[1100px]' : 'w-[780px]'} max-h-[95vh] flex flex-col`}>
        {inner}
      </div>
    </div>
  )
}
