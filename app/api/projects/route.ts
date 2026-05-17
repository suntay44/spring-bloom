import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, type, framework, status, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    name: string
    type: 'fullstack' | 'mobile' | 'landing'
    framework: 'nextjs' | 'expo' | 'static'
    backend_mode?: 'managed_supabase' | 'own_supabase' | 'decide_later'
  }

  const { name, type, framework, backend_mode = 'decide_later' } = body

  if (!name?.trim() || !type || !framework) {
    return NextResponse.json({ error: 'name, type, and framework are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      name: name.trim(),
      type,
      framework,
      backend_mode,
      status: 'draft',
    })
    .select('id, name, type, framework, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
