import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('model_pricing')
    .select('model_id, display_name, provider, min_plan, credits_per_1m_input, credits_per_1m_output')
    .eq('is_active', true)
    .order('provider')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
