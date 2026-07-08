import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { id } = await params

  const { data: cycle, error } = await sb
    .from('PayrollCycle')
    .select('*')
    .eq('id', parseInt(id))
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!cycle) return NextResponse.json({ error: 'Cycle non trouvé' }, { status: 404 })

  const { data: entries, error: entErr } = await sb
    .from('PayrollCycleEntry')
    .select('*')
    .eq('cycleId', parseInt(id))
    .order('lastName', { ascending: true })

  if (entErr) return NextResponse.json({ error: entErr.message }, { status: 500 })

  return NextResponse.json({ ...cycle, entries: entries ?? [] })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { id } = await params
  const { status } = await req.json()

  const { data, error } = await sb
    .from('PayrollCycle')
    .update({ status, updatedAt: new Date().toISOString() })
    .eq('id', parseInt(id))
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sb = createAdminClient()
  const { id } = await params

  const { error } = await sb.from('PayrollCycle').delete().eq('id', parseInt(id))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
