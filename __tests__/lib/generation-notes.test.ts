import { describe, it, expect } from 'vitest'
import { detectSecurityNotes } from '@/lib/security/generation-notes'

function artifact(filePath: string, content: string): string {
  return `<boltArtifact id="t" title="t">
<boltAction type="file" filePath="${filePath}">
${content}
</boltAction>
</boltArtifact>`
}

describe('detectSecurityNotes', () => {
  it('flags RLS enable + create policy in SQL files', () => {
    const text = artifact('supabase/migrations/001.sql', `
      alter table public.todos enable row level security;
      create policy "users own their todos" on public.todos for all using (auth.uid() = user_id);
    `)
    const notes = detectSecurityNotes({ text })
    expect(notes.some(n => n.pattern === 'enable_rls')).toBe(true)
    expect(notes.some(n => n.pattern === 'create_policy')).toBe(true)
    expect(notes[0]!.category).toBe('rls')
  })

  it('flags service-role key references', () => {
    const text = artifact('lib/admin.ts', `
      const k = process.env.SUPABASE_SERVICE_ROLE_KEY
    `)
    const notes = detectSecurityNotes({ text })
    expect(notes.some(n => n.pattern === 'service_role_in_client')).toBe(true)
  })

  it('flags eval() use', () => {
    const text = artifact('lib/parse.ts', `
      function run(x: string) { return eval(x) }
    `)
    const notes = detectSecurityNotes({ text })
    expect(notes.some(n => n.pattern === 'eval_use')).toBe(true)
    expect(notes[0]!.category).toBe('eval')
  })

  it('flags dangerouslySetInnerHTML', () => {
    const text = artifact('app/page.tsx', `
      export default function Page() {
        return <div dangerouslySetInnerHTML={{ __html: '...' }} />
      }
    `)
    const notes = detectSecurityNotes({ text })
    expect(notes.some(n => n.pattern === 'innerhtml_assign')).toBe(true)
    expect(notes[0]!.category).toBe('xss')
  })

  it('flags hardcoded secret-shaped strings', () => {
    // Built from parts so GitHub push-protection / secret scanners don't flag
    // this test fixture as a real Stripe key. The runtime value is identical,
    // so the detector regex still matches.
    const fakeStripeKey = ['sk', 'live', 'abcdefghijklmnopqrstuvwxyz1234567890'].join('_')
    const text = artifact('lib/x.ts', `
      const STRIPE = '${fakeStripeKey}'
    `)
    const notes = detectSecurityNotes({ text })
    expect(notes.some(n => n.pattern === 'hardcoded_token_like')).toBe(true)
    expect(notes[0]!.category).toBe('secrets')
  })

  it('webhook signature verification is detected as positive note', () => {
    const text = artifact('app/api/webhooks/stripe/route.ts', `
      const event = stripe.webhooks.constructEvent(body, sig, secret)
    `)
    const notes = detectSecurityNotes({ text })
    const good = notes.find(n => n.pattern === 'webhook_signature_verify')
    expect(good?.title).toContain('good')
  })

  it('records file path and line number', () => {
    const text = artifact('lib/eval.ts', `
const safe = 1
const danger = eval('1+1')
`)
    const notes = detectSecurityNotes({ text })
    const evalNote = notes.find(n => n.pattern === 'eval_use')
    expect(evalNote?.file_path).toBe('lib/eval.ts')
    expect(evalNote?.line_start).toBeGreaterThanOrEqual(2)
  })

  it('de-duplicates by (pattern, file, line)', () => {
    const text = artifact('app/x.tsx', `
      eval('a')
      eval('a')
    `)
    const notes = detectSecurityNotes({ text })
    const evalNotes = notes.filter(n => n.pattern === 'eval_use')
    // Two evals on different lines = 2 notes, not 1 (different lines)
    expect(evalNotes.length).toBe(2)
  })

  it('caps total notes per generation at 50', () => {
    const lines = Array.from({ length: 200 }, (_, i) => `eval('x${i}')`).join('\n')
    const text = artifact('app/x.tsx', lines)
    const notes = detectSecurityNotes({ text })
    expect(notes.length).toBeLessThanOrEqual(50)
  })

  it('returns empty for benign code', () => {
    const text = artifact('app/page.tsx', `
      export default function Page() {
        return <h1>Hello</h1>
      }
    `)
    const notes = detectSecurityNotes({ text })
    expect(notes.length).toBe(0)
  })

  it('handles no artifacts (falls back to scanning whole text)', () => {
    const notes = detectSecurityNotes({ text: 'Here is some sample: eval("foo")' })
    expect(notes.some(n => n.pattern === 'eval_use')).toBe(true)
  })
})
