import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const folder = (formData.get('folder') as string) || 'misc'

  if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop volumineux (max 5 Mo)' }, { status: 400 })

  const sb = createAdminClient()

  // Ensure bucket exists
  const { data: buckets } = await sb.storage.listBuckets()
  if (!buckets?.some(b => b.name === 'uploads')) {
    await sb.storage.createBucket('uploads', { public: true, fileSizeLimit: 5242880 })
  }

  const ext = file.name.split('.').pop() || 'bin'
  const filename = `${folder}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await sb.storage
    .from('uploads')
    .upload(filename, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = sb.storage.from('uploads').getPublicUrl(filename)

  return NextResponse.json({ url: publicUrl })
}
