import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { id } = await params
  const data = await req.json()

  const updatePayload: Record<string, any> = {}
  if (data.status !== undefined) updatePayload.status = data.status
  if (data.type !== undefined) updatePayload.type = data.type
  if (data.reason !== undefined) updatePayload.reason = data.reason
  if (data.startDate) updatePayload.startDate = new Date(data.startDate).toISOString()
  if (data.endDate) updatePayload.endDate = new Date(data.endDate).toISOString()

  const { data: leave, error } = await sb
    .from('Leave')
    .update(updatePayload)
    .eq('id', parseInt(id))
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(leave)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { id } = await params

  const { error } = await sb.from('Leave').delete().eq('id', parseInt(id))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
