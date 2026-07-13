'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import axios from 'axios'

const COUNTRIES = [
  { name: 'Togo', code: 'TG', currency: 'XOF (FCFA)', dial: '+228', flag: '🇹🇬' },
  { name: 'Bénin', code: 'BJ', currency: 'XOF (FCFA)', dial: '+229', flag: '🇧🇯' },
  { name: "Côte d'Ivoire", code: 'CI', currency: 'XOF (FCFA)', dial: '+225', flag: '🇨🇮' },
  { name: 'Sénégal', code: 'SN', currency: 'XOF (FCFA)', dial: '+221', flag: '🇸🇳' },
  { name: 'Mali', code: 'ML', currency: 'XOF (FCFA)', dial: '+223', flag: '🇲🇱' },
  { name: 'Burkina Faso', code: 'BF', currency: 'XOF (FCFA)', dial: '+226', flag: '🇧🇫' },
  { name: 'Niger', code: 'NE', currency: 'XOF (FCFA)', dial: '+227', flag: '🇳🇪' },
  { name: 'Guinée', code: 'GN', currency: 'GNF', dial: '+224', flag: '🇬🇳' },
  { name: 'Cameroun', code: 'CM', currency: 'XAF (FCFA)', dial: '+237', flag: '🇨🇲' },
  { name: 'Congo', code: 'CG', currency: 'XAF (FCFA)', dial: '+242', flag: '🇨🇬' },
  { name: 'Gabon', code: 'GA', currency: 'XAF (FCFA)', dial: '+241', flag: '🇬🇦' },
  { name: 'Ghana', code: 'GH', currency: 'GHS', dial: '+233', flag: '🇬🇭' },
  { name: 'Nigeria', code: 'NG', currency: 'NGN', dial: '+234', flag: '🇳🇬' },
  { name: 'Maroc', code: 'MA', currency: 'MAD', dial: '+212', flag: '🇲🇦' },
  { name: 'France', code: 'FR', currency: 'EUR', dial: '+33', flag: '🇫🇷' },
]

const REGIONS: Record<string, string[]> = {
  TG: ['Maritime', 'Plateaux', 'Centrale', 'Kara', 'Savanes'],
  BJ: ['Alibori', 'Atakora', 'Atlantique', 'Borgou', 'Collines', 'Couffo', 'Donga', 'Littoral', 'Mono', 'Ouémé', 'Plateau', 'Zou'],
  CI: ['Abidjan', 'Bas-Sassandra', 'Comoé', 'Denguélé', 'Gôh-Djiboua', 'Lacs', 'Lagunes', 'Montagnes', 'Sassandra-Marahoué', 'Savanes', 'Vallée du Bandama', 'Woroba', 'Yamoussoukro', 'Zanzan'],
  SN: ['Dakar', 'Thiès', 'Saint-Louis', 'Diourbel', 'Louga', 'Fatick', 'Kaolack', 'Tambacounda', 'Kolda', 'Ziguinchor', 'Matam', 'Kaffrine', 'Kédougou', 'Sédhiou'],
  CM: ['Adamaoua', 'Centre', 'Est', 'Extrême-Nord', 'Littoral', 'Nord', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Ouest'],
}

const NAV_ITEMS = [
  { id: 'company', label: 'Compagnie', icon: 'business' },
  { id: 'departments', label: 'Départements', icon: 'account_tree' },
  { id: 'branches', label: 'Succursales', icon: 'location_city' },
  { id: 'users', label: 'Utilisateurs', icon: 'group' },
  { id: 'salary', label: 'Paie', icon: 'payments' },
  { id: 'leaves', label: 'Politique de congés', icon: 'event_busy' },
  { id: 'audit', label: "Journal d'audit", icon: 'history' },
]

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-error-container text-error',
  RH: 'bg-primary/10 text-primary',
  ASSISTANT: 'bg-secondary-container text-on-surface',
  STAFF: 'bg-surface-variant text-on-surface-variant',
}

interface AppUser {
  id: number
  username: string
  role: string
  displayName: string | null
  department: string | null
  createdAt: string
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-xl border border-outline-variant">
      <div className="px-4 py-3 border-b border-outline-variant">
        <h3 className="text-title-sm font-semibold text-on-surface">{title}</h3>
        {subtitle && <p className="text-caption text-primary mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function StubSection({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-surface rounded-xl border border-outline-variant p-10 flex flex-col items-center text-center">
      <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-3">{icon}</span>
      <p className="text-title-sm font-semibold text-on-surface">{title}</p>
      <p className="text-body-md text-secondary mt-1">{desc}</p>
      <span className="mt-4 px-3 py-1 rounded-full bg-surface-container text-caption text-secondary">Fonctionnalité à venir</span>
    </div>
  )
}

function SettingsInner() {
  const searchParams = useSearchParams()
  const [section, setSection] = useState(searchParams.get('section') || 'company')

  // Company
  const [company, setCompany] = useState<Record<string, string>>({})
  const [companyLoading, setCompanyLoading] = useState(false)
  const [companySaved, setCompanySaved] = useState(false)

  // Departments
  const [depts, setDepts] = useState<string[]>([])
  const [newDept, setNewDept] = useState('')
  const [deptSaved, setDeptSaved] = useState(false)

  // Branches
  const [branches, setBranches] = useState<Array<{ name: string; city: string }>>([])
  const [newBranch, setNewBranch] = useState({ name: '', city: '' })
  const [branchSaved, setBranchSaved] = useState(false)

  // Users
  const [users, setUsers] = useState<AppUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [showNewUser, setShowNewUser] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'STAFF', displayName: '', department: '' })
  const [creatingUser, setCreatingUser] = useState(false)

  // Salary
  const [salary, setSalary] = useState<Record<string, string>>({})
  const [salarySaved, setSalarySaved] = useState(false)

  // Leave policies
  const [leaves, setLeaves] = useState<Record<string, string>>({})
  const [leavesSaved, setLeavesSaved] = useState(false)

  // Toast notification
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const logoRef = useRef<HTMLInputElement>(null)
  const [logoUploading, setLogoUploading] = useState(false)

  const ic = 'w-full px-3 py-2 border border-outline-variant rounded-lg text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors'

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1 * 1024 * 1024) { showToast('Fichier trop volumineux (max 1 Mo)', 'error'); return }
    setLogoUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'logos')
      const { data } = await axios.post('/api/upload', fd)
      setCompany(c => ({ ...c, company_logo: data.url }))
      showToast('Logo téléchargé avec succès')
    } catch {
      showToast('Erreur lors du téléchargement', 'error')
    } finally {
      setLogoUploading(false)
      if (logoRef.current) logoRef.current.value = ''
    }
  }

  useEffect(() => {
    if (section === 'company') {
      setCompanyLoading(true)
      axios.get('/api/settings?section=company')
        .then(r => setCompany(typeof r.data === 'object' && r.data !== null ? r.data : {}))
        .catch(() => setCompany({}))
        .finally(() => setCompanyLoading(false))
    } else if (section === 'departments') {
      axios.get('/api/settings?section=departments')
        .then(r => { try { setDepts(JSON.parse(r.data?.departments_list || '[]')) } catch { setDepts([]) } })
        .catch(() => setDepts([]))
    } else if (section === 'branches') {
      axios.get('/api/settings?section=branches')
        .then(r => { try { setBranches(JSON.parse(r.data?.branches_list || '[]')) } catch { setBranches([]) } })
        .catch(() => setBranches([]))
    } else if (section === 'users') {
      setUsersLoading(true)
      axios.get('/api/settings?section=users')
        .then(r => setUsers(Array.isArray(r.data) ? r.data : []))
        .catch(() => setUsers([]))
        .finally(() => setUsersLoading(false))
    } else if (section === 'salary') {
      axios.get('/api/settings?section=salary')
        .then(r => setSalary(typeof r.data === 'object' && r.data !== null ? r.data : {}))
        .catch(() => setSalary({}))
    } else if (section === 'leaves') {
      axios.get('/api/settings?section=leaves')
        .then(r => setLeaves(typeof r.data === 'object' && r.data !== null ? r.data : {}))
        .catch(() => setLeaves({}))
    }
  }, [section])

  const selectedCountry = COUNTRIES.find(c => c.name === company.company_country) || COUNTRIES[0]
  const setC = (key: string, val: string) => setCompany(c => ({ ...c, [key]: val }))

  async function saveCompany() {
    setCompanyLoading(true)
    try {
      await axios.put('/api/settings', { section: 'company', data: company })
      setCompanySaved(true)
      showToast('Paramètres entreprise enregistrés')
      setTimeout(() => setCompanySaved(false), 2500)
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erreur lors de la sauvegarde', 'error')
    } finally {
      setCompanyLoading(false)
    }
  }

  async function saveDepts() {
    try {
      await axios.put('/api/settings', { section: 'departments', data: { departments_list: JSON.stringify(depts) } })
      setDeptSaved(true)
      showToast('Départements enregistrés')
      setTimeout(() => setDeptSaved(false), 2000)
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erreur lors de la sauvegarde', 'error')
    }
  }

  async function saveBranches() {
    try {
      await axios.put('/api/settings', { section: 'branches', data: { branches_list: JSON.stringify(branches) } })
      setBranchSaved(true)
      showToast('Succursales enregistrées')
      setTimeout(() => setBranchSaved(false), 2000)
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erreur lors de la sauvegarde', 'error')
    }
  }

  async function saveSalary() {
    try {
      await axios.put('/api/settings', { section: 'salary', data: salary })
      setSalarySaved(true)
      showToast('Paramètres de paie enregistrés')
      setTimeout(() => setSalarySaved(false), 2000)
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erreur lors de la sauvegarde', 'error')
    }
  }

  async function saveLeaves() {
    try {
      await axios.put('/api/settings', { section: 'leaves', data: leaves })
      setLeavesSaved(true)
      showToast('Politique de congés enregistrée')
      setTimeout(() => setLeavesSaved(false), 2000)
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erreur lors de la sauvegarde', 'error')
    }
  }

  async function createUser() {
    setCreatingUser(true)
    try {
      await axios.post('/api/settings', { action: 'create_user', data: newUser })
      setShowNewUser(false)
      setNewUser({ username: '', password: '', role: 'STAFF', displayName: '', department: '' })
      const r = await axios.get('/api/settings?section=users')
      setUsers(Array.isArray(r.data) ? r.data : [])
      showToast('Utilisateur créé avec succès')
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error')
    } finally {
      setCreatingUser(false)
    }
  }

  async function deleteUser(id: number) {
    if (!confirm('Supprimer cet utilisateur ?')) return
    try {
      await axios.post('/api/settings', { action: 'delete_user', data: { userId: id } })
      setUsers(u => u.filter(u => u.id !== id))
      showToast('Utilisateur supprimé')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erreur lors de la suppression', 'error')
    }
  }

  const PhonePrefix = () => (
    <div className="flex items-center gap-1 px-2.5 border border-r-0 border-outline-variant rounded-l-lg bg-surface-container text-body-md whitespace-nowrap select-none">
      <span className="text-[16px]">{selectedCountry.flag}</span>
      <span className="text-secondary text-caption">{selectedCountry.dial}</span>
    </div>
  )

  return (
    <div className="flex gap-5">
      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-level-3 text-body-md font-medium transition-all
          ${toast.type === 'error' ? 'bg-error-container text-error border border-error/30' : 'bg-tertiary-container text-on-tertiary-container border border-tertiary/30'}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          {toast.msg}
        </div>
      )}

      {/* ── LEFT NAV ── */}
      <div className="w-52 flex-shrink-0">
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden sticky top-0">
          <div className="px-4 py-3 border-b border-outline-variant">
            <h1 className="text-title-sm font-bold text-on-surface">Paramètres</h1>
            <p className="text-caption text-secondary mt-0.5">Configuration de HyConnect</p>
          </div>
          <nav className="p-2 space-y-0.5">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-body-md text-left transition-colors ${
                  section === item.id
                    ? 'bg-primary-container text-on-primary-container font-semibold'
                    : 'text-secondary hover:text-on-surface hover:bg-surface-container-highest'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={{ fontVariationSettings: section === item.id ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 300" }}
                >{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ── RIGHT CONTENT ── */}
      <div className="flex-1 space-y-5 min-w-0">

        {/* ════ COMPAGNIE ════ */}
        {section === 'company' && (
          <>
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface">Paramètres</h2>
              <p className="text-body-md text-secondary">Gérer le profil de l'entreprise, les paramètres de pays et les préférences</p>
            </div>

            <SectionCard title="Profil de l'entreprise" subtitle="L'identité légale de votre entreprise et ses informations d'immatriculation.">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-body-md font-medium text-on-surface block mb-1">Nom de l'entreprise</label>
                  <input className={ic} value={company.company_name || ''} onChange={e => setC('company_name', e.target.value)} placeholder="ex: Hyundai Motors Togo" />
                </div>
                <div>
                  <label className="text-body-md font-medium text-on-surface block mb-1">NIF</label>
                  <input className={ic} value={company.company_nif || ''} onChange={e => setC('company_nif', e.target.value)} placeholder="Numéro d'identification fiscale" />
                </div>
                <div>
                  <label className="text-body-md font-medium text-on-surface block mb-1">CNSS Reg</label>
                  <input className={ic} value={company.company_social_security || ''} onChange={e => setC('company_social_security', e.target.value)} placeholder="N° enregistrement CNSS" />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Pays et devise" subtitle="Sélectionnez le pays où votre entreprise opère. La devise est automatiquement déduite.">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-body-md font-medium text-on-surface block mb-1">Pays</label>
                  <div className="relative">
                    <select
                      value={company.company_country || 'Togo'}
                      onChange={e => {
                        const c = COUNTRIES.find(c => c.name === e.target.value)
                        setCompany(prev => ({ ...prev, company_country: e.target.value, company_currency: c?.currency || '' }))
                      }}
                      className={`${ic} appearance-none pr-8`}
                    >
                      {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[14px] text-on-surface-variant pointer-events-none">expand_more</span>
                  </div>
                </div>
                <div>
                  <label className="text-body-md font-medium text-on-surface block mb-1">
                    Devise
                    <span className="ml-2 text-caption text-secondary font-normal">— déterminée par le pays</span>
                  </label>
                  <input
                    value={company.company_currency || selectedCountry.currency}
                    disabled
                    className={`${ic} bg-surface-container text-secondary cursor-not-allowed`}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Adresse de l'entreprise" subtitle="L'adresse physique de votre entreprise">
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-body-md font-medium text-on-surface block mb-1">Adresse (rue)</label>
                    <input className={ic} value={company.company_address || ''} onChange={e => setC('company_address', e.target.value)} placeholder="123 Rue Principale" />
                  </div>
                  <div>
                    <label className="text-body-md font-medium text-on-surface block mb-1">Adresse ligne 2</label>
                    <input className={ic} value={company.company_address2 || ''} onChange={e => setC('company_address2', e.target.value)} placeholder="Suite, étage, bâtiment (optionnel)" />
                  </div>
                  <div>
                    <label className="text-body-md font-medium text-on-surface block mb-1">Ville / Commune</label>
                    <input className={ic} value={company.company_city || ''} onChange={e => setC('company_city', e.target.value)} placeholder="Lomé" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-body-md font-medium text-on-surface block mb-1">Région / District / Département</label>
                    <div className="relative">
                      <select
                        value={company.company_region || ''}
                        onChange={e => setC('company_region', e.target.value)}
                        className={`${ic} appearance-none pr-8`}
                      >
                        <option value="">Sélectionner...</option>
                        {(REGIONS[selectedCountry.code] || []).map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[14px] text-on-surface-variant pointer-events-none">expand_more</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-body-md font-medium text-on-surface block mb-1">BP / Boîte Postale</label>
                    <input className={ic} value={company.company_postal || ''} onChange={e => setC('company_postal', e.target.value)} placeholder="BP 1234" />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Coordonnées" subtitle="Coordonnées de l'entreprise et personne de contact principale">
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-body-md font-medium text-on-surface block mb-1">Numéro de téléphone</label>
                    <div className="flex">
                      <PhonePrefix />
                      <input className={`${ic} rounded-l-none`} value={company.company_phone || ''} onChange={e => setC('company_phone', e.target.value)} placeholder="90 00 00 00" />
                    </div>
                  </div>
                  <div>
                    <label className="text-body-md font-medium text-on-surface block mb-1">Email de l'entreprise</label>
                    <input className={ic} type="email" value={company.company_email || ''} onChange={e => setC('company_email', e.target.value)} placeholder="contact@company.com" />
                  </div>
                  <div>
                    <label className="text-body-md font-medium text-on-surface block mb-1">Site web</label>
                    <input className={ic} value={company.company_website || ''} onChange={e => setC('company_website', e.target.value)} placeholder="https://www.company.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-body-md font-medium text-on-surface block mb-1">Nom complet du contact</label>
                    <input className={ic} value={company.company_contact_name || ''} onChange={e => setC('company_contact_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-body-md font-medium text-on-surface block mb-1">Titre ou fonction du contact</label>
                    <input className={ic} value={company.company_contact_title || ''} onChange={e => setC('company_contact_title', e.target.value)} placeholder="ex : Directeur RH, PDG" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-body-md font-medium text-on-surface block mb-1">Téléphone du contact</label>
                    <div className="flex">
                      <PhonePrefix />
                      <input className={`${ic} rounded-l-none`} value={company.company_contact_phone || ''} onChange={e => setC('company_contact_phone', e.target.value)} placeholder="90 00 00 00" />
                    </div>
                  </div>
                  <div>
                    <label className="text-body-md font-medium text-on-surface block mb-1">Email du contact</label>
                    <input className={ic} type="email" value={company.company_contact_email || ''} onChange={e => setC('company_contact_email', e.target.value)} />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Logo de l'entreprise" subtitle="Affiché sur les bulletins de paie, les contrats et le portail employé.">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-surface-container rounded-xl border-2 border-dashed border-outline-variant flex items-center justify-center overflow-hidden">
                  {company.company_logo
                    ? <img src={company.company_logo} alt="Logo" className="w-full h-full object-contain" />
                    : <span className="material-symbols-outlined text-[32px] text-on-surface-variant">image</span>
                  }
                </div>
                <div>
                  <button
                    onClick={() => logoRef.current?.click()}
                    disabled={logoUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-outline rounded-lg text-label-md text-on-surface hover:bg-surface-container-low disabled:opacity-50 transition-colors"
                  >
                    {logoUploading
                      ? <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      : <span className="material-symbols-outlined text-[15px]">upload</span>
                    }
                    {logoUploading ? 'Téléchargement...' : 'Télécharger le logo'}
                  </button>
                  <p className="text-caption text-secondary mt-1">PNG, JPG, SVG ou WebP. Max 1 Mo.</p>
                  <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </div>
              </div>
            </SectionCard>

            <div className="flex justify-end">
              <button
                onClick={saveCompany}
                disabled={companyLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md font-semibold hover:bg-primary-fixed-variant disabled:opacity-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">{companySaved ? 'check' : 'save'}</span>
                {companySaved ? 'Enregistré !' : 'Enregistrer'}
              </button>
            </div>

          </>
        )}

        {/* ════ DÉPARTEMENTS ════ */}
        {section === 'departments' && (
          <>
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface">Départements</h2>
              <p className="text-body-md text-secondary">Gérez les départements de votre organisation</p>
            </div>
            <SectionCard title="Liste des départements" subtitle="Ces départements sont disponibles lors de la création ou modification d'un employé.">
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                  <input
                    className={ic}
                    value={newDept}
                    onChange={e => setNewDept(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newDept.trim()) { setDepts(d => [...d, newDept.trim()]); setNewDept('') } }}
                    placeholder="Nom du département (Entrée pour ajouter)"
                  />
                  <button
                    onClick={() => { if (newDept.trim()) { setDepts(d => [...d, newDept.trim()]); setNewDept('') } }}
                    className="px-3 py-2 bg-primary text-on-primary rounded-lg text-label-md hover:bg-primary-fixed-variant transition-colors flex items-center gap-1 whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Ajouter
                  </button>
                </div>
                {depts.length === 0
                  ? <p className="text-body-md text-secondary py-6 text-center">Aucun département configuré</p>
                  : (
                    <div className="space-y-1">
                      {depts.map((d, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-surface-container-low rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-primary">account_tree</span>
                            <span className="text-body-md text-on-surface">{d}</span>
                          </div>
                          <button onClick={() => setDepts(depts.filter((_, j) => j !== i))} className="p-1 rounded hover:bg-error-container text-secondary hover:text-error transition-colors">
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                }
                <div className="flex justify-end pt-2 border-t border-outline-variant">
                  <button onClick={saveDepts} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary rounded-lg text-label-md font-semibold hover:bg-primary-fixed-variant transition-colors">
                    <span className="material-symbols-outlined text-[15px]">{deptSaved ? 'check' : 'save'}</span>
                    {deptSaved ? 'Enregistré !' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </SectionCard>
          </>
        )}

        {/* ════ SUCCURSALES ════ */}
        {section === 'branches' && (
          <>
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface">Succursales</h2>
              <p className="text-body-md text-secondary">Gérez les agences et succursales de votre entreprise</p>
            </div>
            <SectionCard title="Liste des succursales" subtitle="Vos agences ou sites d'exploitation.">
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_11rem_auto] gap-2 items-center">
                  <input
                    className={ic}
                    value={newBranch.name}
                    onChange={e => setNewBranch(b => ({ ...b, name: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter' && newBranch.name.trim()) { setBranches(b => [...b, { ...newBranch }]); setNewBranch({ name: '', city: '' }) } }}
                    placeholder="Nom de la succursale"
                  />
                  <input
                    className={ic}
                    value={newBranch.city}
                    onChange={e => setNewBranch(b => ({ ...b, city: e.target.value }))}
                    placeholder="Ville"
                  />
                  <button
                    onClick={() => { if (newBranch.name.trim()) { setBranches(b => [...b, { ...newBranch }]); setNewBranch({ name: '', city: '' }) } }}
                    className="px-3 py-2 bg-primary text-on-primary rounded-lg text-label-md hover:bg-primary-fixed-variant transition-colors flex items-center gap-1 whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Ajouter
                  </button>
                </div>
                {branches.length === 0
                  ? <p className="text-body-md text-secondary py-6 text-center">Aucune succursale configurée</p>
                  : (
                    <div className="space-y-1">
                      {branches.map((b, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-surface-container-low rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-primary">location_city</span>
                            <span className="text-body-md font-medium text-on-surface">{b.name}</span>
                            {b.city && <span className="text-caption text-secondary">— {b.city}</span>}
                          </div>
                          <button onClick={() => setBranches(branches.filter((_, j) => j !== i))} className="p-1 rounded hover:bg-error-container text-secondary hover:text-error transition-colors">
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                }
                <div className="flex justify-end pt-2 border-t border-outline-variant">
                  <button onClick={saveBranches} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary rounded-lg text-label-md font-semibold hover:bg-primary-fixed-variant transition-colors">
                    <span className="material-symbols-outlined text-[15px]">{branchSaved ? 'check' : 'save'}</span>
                    {branchSaved ? 'Enregistré !' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </SectionCard>
          </>
        )}

        {/* ════ UTILISATEURS ════ */}
        {section === 'users' && (
          <>
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface">Utilisateurs</h2>
              <p className="text-body-md text-secondary">Gérez les comptes utilisateurs et leurs niveaux d'accès</p>
            </div>
            <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
              <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
                <h3 className="text-title-sm font-semibold text-on-surface">Comptes ({users.length})</h3>
                <button
                  onClick={() => setShowNewUser(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary rounded-lg text-label-md font-semibold hover:bg-primary-fixed-variant transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  Ajouter un utilisateur
                </button>
              </div>
              <table className="w-full text-left">
                <thead className="bg-surface-container border-b border-outline-variant">
                  <tr>
                    {['Utilisateur', 'Rôle', 'Département', 'Créé le', ''].map(h => (
                      <th key={h} className="px-4 py-2 text-label-md text-secondary uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {usersLoading
                    ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-surface-variant rounded" /></td>
                        ))}
                      </tr>
                    ))
                    : users.map(user => (
                      <tr key={user.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-container rounded-full flex items-center justify-center text-primary text-body-md font-bold">
                              {(user.displayName || user.username).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-body-md font-medium text-on-surface">{user.displayName || user.username}</p>
                              <p className="text-caption text-secondary">@{user.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-caption px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role] || 'bg-surface-variant'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-body-md text-secondary">{user.department || '—'}</td>
                        <td className="px-4 py-3 text-body-md text-secondary">{new Date(user.createdAt).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => deleteUser(user.id)} className="p-1.5 rounded-lg hover:bg-error-container text-secondary hover:text-error transition-colors">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ════ PAIE ════ */}
        {section === 'salary' && (
          <>
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface">Paramètres de paie</h2>
              <p className="text-body-md text-secondary">Taux de cotisations, salaire minimum et configuration du cycle de paie</p>
            </div>
            <SectionCard title="Cotisations CNSS" subtitle="Taux appliqués lors du calcul des bulletins de paie.">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: 'cnss_rate', label: 'Part salariale CNSS (%)', placeholder: '3.2' },
                  { key: 'cnss_employer_rate', label: "Part patronale CNSS (%)", placeholder: '13.5' },
                  { key: 'tax_rate', label: "Taux d'imposition par défaut (%)", placeholder: '15' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-body-md font-medium text-on-surface block mb-1">{f.label}</label>
                    <input className={ic} type="number" step="0.1" value={salary[f.key] || ''} onChange={e => setSalary(s => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Salaire et cycle" subtitle="Paramètres de base du cycle de paie.">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-body-md font-medium text-on-surface block mb-1">Salaire minimum (SMIG)</label>
                  <input className={ic} type="number" value={salary.min_wage || ''} onChange={e => setSalary(s => ({ ...s, min_wage: e.target.value }))} placeholder="35000" />
                </div>
                <div>
                  <label className="text-body-md font-medium text-on-surface block mb-1">Jour de versement (1–28)</label>
                  <input className={ic} type="number" min="1" max="28" value={salary.payroll_day || ''} onChange={e => setSalary(s => ({ ...s, payroll_day: e.target.value }))} placeholder="25" />
                </div>
              </div>
            </SectionCard>
            <div className="flex justify-end">
              <button onClick={saveSalary} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md font-semibold hover:bg-primary-fixed-variant transition-colors">
                <span className="material-symbols-outlined text-[15px]">{salarySaved ? 'check' : 'save'}</span>
                {salarySaved ? 'Enregistré !' : 'Enregistrer'}
              </button>
            </div>
          </>
        )}

        {/* ════ POLITIQUE DE CONGÉS ════ */}
        {section === 'leaves' && (
          <>
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface">Politique de congés</h2>
              <p className="text-body-md text-secondary">Définissez les droits et règles applicables aux absences et congés</p>
            </div>
            <SectionCard title="Droits aux congés" subtitle="Nombre de jours accordés par type de congé.">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: 'leave_annual_days', label: 'Congés annuels (jours/an)', placeholder: '22' },
                  { key: 'leave_sick_days', label: 'Congés maladie (jours/an)', placeholder: '30' },
                  { key: 'leave_maternity_days', label: 'Congé maternité (jours)', placeholder: '90' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-body-md font-medium text-on-surface block mb-1">{f.label}</label>
                    <input className={ic} type="number" value={leaves[f.key] || ''} onChange={e => setLeaves(l => ({ ...l, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Règles et préavis" subtitle="Délais et limitations applicables aux demandes de congé.">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-body-md font-medium text-on-surface block mb-1">Délai de préavis minimum (jours)</label>
                  <input className={ic} type="number" value={leaves.leave_notice_days || ''} onChange={e => setLeaves(l => ({ ...l, leave_notice_days: e.target.value }))} placeholder="3" />
                </div>
                <div>
                  <label className="text-body-md font-medium text-on-surface block mb-1">Report maximal de jours</label>
                  <input className={ic} type="number" value={leaves.leave_carryover || ''} onChange={e => setLeaves(l => ({ ...l, leave_carryover: e.target.value }))} placeholder="5" />
                </div>
              </div>
            </SectionCard>
            <div className="flex justify-end">
              <button onClick={saveLeaves} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md font-semibold hover:bg-primary-fixed-variant transition-colors">
                <span className="material-symbols-outlined text-[15px]">{leavesSaved ? 'check' : 'save'}</span>
                {leavesSaved ? 'Enregistré !' : 'Enregistrer'}
              </button>
            </div>
          </>
        )}

        {/* ════ STUBS ════ */}
        {section === 'audit' && (
          <>
            <div><h2 className="text-headline-sm font-bold text-on-surface">Journal d'audit</h2></div>
            <StubSection icon="history" title="Journal d'activité" desc="Suivez toutes les actions effectuées par les utilisateurs dans l'application." />
          </>
        )}
      </div>

      {/* ── Modal Nouvel utilisateur ── */}
      {showNewUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-level-3 border border-outline-variant w-[460px] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
              <h3 className="text-title-sm font-semibold text-on-surface">Nouvel utilisateur</h3>
              <button onClick={() => setShowNewUser(false)} className="p-1 rounded-full hover:bg-surface-container-high text-secondary">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-4 space-y-3">
              {[
                { name: 'username', label: "Nom d'utilisateur *", type: 'text' },
                { name: 'password', label: 'Mot de passe *', type: 'password' },
                { name: 'displayName', label: "Nom d'affichage", type: 'text' },
                { name: 'department', label: 'Département', type: 'text' },
              ].map(f => (
                <div key={f.name}>
                  <label className="text-body-md font-medium text-on-surface block mb-1">{f.label}</label>
                  <input type={f.type} value={(newUser as any)[f.name]} onChange={e => setNewUser(u => ({ ...u, [f.name]: e.target.value }))} className={ic} />
                </div>
              ))}
              <div>
                <label className="text-body-md font-medium text-on-surface block mb-1">Rôle</label>
                <div className="relative">
                  <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))} className={`${ic} appearance-none pr-8`}>
                    {['ADMIN', 'RH', 'ASSISTANT', 'STAFF'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[14px] text-on-surface-variant pointer-events-none">expand_more</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-outline-variant">
              <button onClick={() => setShowNewUser(false)} className="px-4 py-2 border border-outline text-secondary rounded-lg text-label-md hover:bg-surface-container-low">Annuler</button>
              <button
                onClick={createUser}
                disabled={creatingUser || !newUser.username || !newUser.password}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md font-semibold hover:bg-primary-fixed-variant disabled:opacity-50 transition-colors"
              >
                {creatingUser ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-secondary text-body-md">Chargement...</div>}>
      <SettingsInner />
    </Suspense>
  )
}
