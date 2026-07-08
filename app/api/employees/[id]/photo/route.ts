import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureUploadsBucket } from '@/lib/supabase/storage'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const empId = parseInt(id)
  const formData = await req.formData()
  const file = formData.get('photo') as File | null

  if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

  const sb = createAdminClient()
  await ensureUploadsBucket()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `employees/${empId}/photo.${ext}`

  const { error: uploadError } = await sb.storage
    .from('uploads')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = sb.storage.from('uploads').getPublicUrl(path)

  const { error: updateError } = await sb
    .from('Employee')
    .update({ photoPath: publicUrl, updatedAt: new Date().toISOString() })
    .eq('id', empId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ photoPath: publicUrl })
}
