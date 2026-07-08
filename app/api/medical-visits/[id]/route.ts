import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { id } = await params
  const data = await req.json()

  const { data: visit, error } = await sb
    .from('MedicalVisit')
    .update({
      ...data,
      date: data.date ? new Date(data.date).toISOString() : undefined,
      nextVisit: data.nextVisit ? new Date(data.nextVisit).toISOString() : null,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', parseInt(id))
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(visit)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { id } = await params

  const { error } = await sb.from('MedicalVisit').delete().eq('id', parseInt(id))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
