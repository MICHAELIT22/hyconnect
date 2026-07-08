import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employeeId')
  const category = searchParams.get('category') || ''

  let query = sb
    .from('Document')
    .select('*, Employee(id,firstName,lastName,matricule)')
    .order('createdAt', { ascending: false })

  if (employeeId) query = query.eq('employeeId', parseInt(employeeId))
  if (category) query = query.eq('category', category)

  const { data: documents, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const normalized = (documents || []).map((d: any) => ({
    ...d,
    employee: d.Employee ?? null,
    Employee: undefined,
  }))

  return NextResponse.json(normalized)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const employeeId = parseInt(formData.get('employeeId') as string)
  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const category = formData.get('category') as string
  const expiryDate = formData.get('expiryDate') as string | null
  const tags = formData.get('tags') as string | null

  let filePath = ''

  if (file) {
    const ext = file.name.split('.').pop()
    const path = `documents/${employeeId}/${Date.now()}.${ext}`

    const { error } = await sb.storage
      .from('uploads')
      .upload(path, file, { contentType: file.type })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: { publicUrl } } = sb.storage.from('uploads').getPublicUrl(path)
    filePath = publicUrl
  }

  const { data: document, error } = await sb
    .from('Document')
    .insert([{
      employeeId,
      name,
      type,
      category,
      path: filePath,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(document, { status: 201 })
}
