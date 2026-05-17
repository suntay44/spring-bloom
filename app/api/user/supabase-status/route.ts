import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('profiles')
    .select('supabase_status')
    .eq('id', user.id)
    .single() as { data: { supabase_status: string } | null; error: unknown }

  return NextResponse.json({ status: data?.supabase_status ?? 'none' })
}
