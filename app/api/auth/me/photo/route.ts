import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/auth'
import { ensureUploadsBucket } from '@/lib/supabase/storage'

// POST /api/auth/me/photo — upload photo de profil utilisateur
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('photo') as File | null
  if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

  const sb = createAdminClient()
  await ensureUploadsBucket()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `users/${user.id}/photo.${ext}`

  const { error: uploadError } = await sb.storage
    .from('uploads')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = sb.storage.from('uploads').getPublicUrl(path)

  const { error: updateError } = await sb
    .from('User')
    .update({ photoPath: publicUrl })
    .eq('id', user.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ photoPath: publicUrl })
}
