'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import axios from 'axios'

interface Document {
  id: number
  name: string
  type: string
  category: string
  path: string
  expiryDate: string | null
  status: string
  createdAt: string
  employee: { id: number; firstName: string; lastName: string; matricule: string }
}

interface Employee {
  id: number
  firstName: string
  lastName: string
  matricule: string
}

const emptyForm = { employeeId: '', name: '', type: 'PDF', category: 'Contrat', expiryDate: '' }

const ic = 'w-full px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-body-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchDocuments = useCallback(() => {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    setLoading(true)
    axios.get(`/api/documents?${params}`).then(r => setDocuments(r.data)).finally(() => setLoading(false))
  }, [category])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  useEffect(() => {
    axios.get('/api/employees?limit=500').then(r => {
      const data = r.data
      setEmployees(Array.isArray(data) ? data : data.employees ?? [])
    })
  }, [])

  function isExpiringSoon(date: string | null) {
    if (!date) return false
    return new Date(date).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setSelectedFile(null)
    setShowModal(true)
  }

  function openEdit(doc: Document) {
    setEditingId(doc.id)
    setForm({
      employeeId: String(doc.employee.id),
      name: doc.name,
      type: doc.type,
      category: doc.category,
      expiryDate: doc.expiryDate ? doc.expiryDate.slice(0, 10) : '',
    })
    setSelectedFile(null)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm)
    setSelectedFile(null)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    if (!editingId && !selectedFile) return
    setSaving(true)
    try {
      if (editingId) {
        await axios.put(`/api/documents/${editingId}`, {
          name: form.name,
          type: form.type,
          category: form.category,
          expiryDate: form.expiryDate || null,
        })
      } else {
        const fd = new FormData()
        fd.append('employeeId', form.employeeId)
        fd.append('name', form.name)
        fd.append('type', form.type)
        fd.append('category', form.category)
        if (form.expiryDate) fd.append('expiryDate', form.expiryDate)
        if (selectedFile) fd.append('file', selectedFile)
        await axios.post('/api/documents', fd)
      }
      closeModal()
      fetchDocuments()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    await axios.delete(`/api/documents/${id}`)
    setDeleteConfirm(null)
    fetchDocuments()
  }

  const filtered = documents.filter(doc => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      doc.name.toLowerCase().includes(q) ||
      `${doc.employee.firstName} ${doc.employee.lastName}`.toLowerCase().includes(q) ||
      doc.employee.matricule.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-md font-semibold text-on-surface">Documents</h1>
          <p className="text-body-md text-secondary">{filtered.length} document(s)</p>
        </div>
        <button
          onClick={openCreate}
          className="btn-primary"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Ajouter un document
        </button>
      </div>

      {/* Filters */}
      <div className="card flex gap-3 flex-wrap">
        <select
          className="input-field w-48"
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          <option value="">Toutes catégories</option>
          <option value="Identité">Identité</option>
          <option value="Contrat">Contrat</option>
          <option value="Diplôme">Diplôme</option>
          <option value="Médical">Médical</option>
          <option value="Autre">Autre</option>
        </select>
        <div className="relative flex-1 min-w-48">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
          <input
            type="text"
            placeholder="Rechercher par nom ou employé…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field w-full pl-8"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 bg-surface-variant rounded-2xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-3 card text-center py-12 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl block mb-2">folder_open</span>
            Aucun document trouvé
          </div>
        ) : (
          filtered.map(doc => (
            <div key={doc.id} className="card hover:shadow-level-2 transition-shadow group">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary text-xl">
                    {doc.type === 'PDF' ? 'picture_as_pdf' : doc.type === 'IMAGE' ? 'image' : 'description'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-on-surface text-sm truncate">{doc.name}</p>
                  <p className="text-caption text-on-surface-variant">{doc.employee.firstName} {doc.employee.lastName}</p>
                  <span className="text-caption bg-secondary-container px-2 py-0.5 rounded-full mt-1 inline-block">{doc.category}</span>
                </div>
                {/* Action icons */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(doc)}
                    title="Modifier"
                    className="p-1 rounded-lg hover:bg-surface-variant text-on-surface-variant hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(doc.id)}
                    title="Supprimer"
                    className="p-1 rounded-lg hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-caption text-on-surface-variant">
                  {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                </p>
                {doc.expiryDate && (
                  <span className={`text-caption px-2 py-0.5 rounded-full ${isExpiringSoon(doc.expiryDate) ? 'bg-warning-container text-warning' : 'text-on-surface-variant'}`}>
                    Exp: {new Date(doc.expiryDate).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
              {doc.path && (
                <a
                  href={doc.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 btn-secondary w-full text-center text-caption py-1.5 flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  Ouvrir
                </a>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-2xl shadow-level-3 w-[480px] max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-title-md font-semibold text-on-surface">
                {editingId ? 'Modifier le document' : 'Ajouter un document'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-surface-variant text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              {/* Employee select (create only) */}
              {!editingId && (
                <div>
                  <label className="block text-label-md text-on-surface-variant mb-1">Employé *</label>
                  <select
                    className={ic}
                    value={form.employeeId}
                    onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                  >
                    <option value="">Sélectionner un employé</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.matricule})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">Nom du document *</label>
                <input
                  type="text"
                  className={ic}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Contrat CDI"
                />
              </div>

              {/* Type + Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-label-md text-on-surface-variant mb-1">Type</label>
                  <select
                    className={ic}
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  >
                    <option value="PDF">PDF</option>
                    <option value="IMAGE">IMAGE</option>
                    <option value="WORD">WORD</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-label-md text-on-surface-variant mb-1">Catégorie</label>
                  <select
                    className={ic}
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    <option value="Identité">Identité</option>
                    <option value="Contrat">Contrat</option>
                    <option value="Diplôme">Diplôme</option>
                    <option value="Médical">Médical</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              {/* Expiry date */}
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">Date d'expiration (optionnelle)</label>
                <input
                  type="date"
                  className={ic}
                  value={form.expiryDate}
                  onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                />
              </div>

              {/* File upload (create only) */}
              {!editingId && (
                <div>
                  <label className="block text-label-md text-on-surface-variant mb-1">Fichier *</label>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-outline-variant rounded-lg py-4 flex flex-col items-center gap-1 text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-2xl">upload_file</span>
                    <span className="text-body-md">
                      {selectedFile ? selectedFile.name : 'Cliquer pour sélectionner un fichier'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={closeModal}
                className="px-3 py-1.5 rounded-lg text-label-md text-on-surface-variant hover:bg-surface-variant transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || (!editingId && (!form.employeeId || !selectedFile))}
                className="bg-primary text-on-primary text-label-md px-4 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-primary-fixed-variant transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                {editingId ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-2xl shadow-level-3 w-[360px] p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-error-container rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-error">delete</span>
              </div>
              <div>
                <h2 className="text-title-md font-semibold text-on-surface">Supprimer le document</h2>
                <p className="text-body-md text-on-surface-variant mt-1">
                  Cette action est irréversible. Confirmer la suppression ?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 rounded-lg text-label-md text-on-surface-variant hover:bg-surface-variant transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="bg-error text-on-error text-label-md px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
