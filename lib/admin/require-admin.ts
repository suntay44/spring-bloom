/**
 * Server-side admin auth guard.
 *
 * Usage in pages (server components):
 *   const user = await requireAdminPage()  // redirects to /login if not admin
 *
 * Usage in API routes:
 *   const result = await requireAdminApi()
 *   if ('error' in result) return result.error
 *   const { user } = result
 */
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

async function getAdminUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Read the user's own profile — RLS allows this via "users read their profile" policy
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return profile?.is_admin === true ? user : null
}

/** For server component pages — redirects silently to /login on failure */
export async function requireAdminPage(): Promise<User> {
  const user = await getAdminUser()
  if (!user) redirect('/login')
  return user
}

/** For API route handlers — returns a 401/403 JSON response on failure */
export async function requireAdminApi(): Promise<
  { user: User } | { error: NextResponse }
> {
  const user = await getAdminUser()
  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { user }
}
