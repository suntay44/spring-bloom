import { describe, it, expect } from 'vitest'
import { scanRls } from '@/lib/security/scanners/rls'

describe('RLS Static Analyzer', () => {
  it('flags a table created without RLS', () => {
    const migrations = {
      '001.sql': `create table public.todos (id uuid primary key, title text);`,
    }
    const result = scanRls({ migrations })
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({
      scanner: 'rls', severity: 'critical', category: 'rls',
      file_path: '001.sql', line: 1, blocks_deploy: true,
    })
    expect(result.findings[0]!.title).toContain('public.todos')
  })

  it('passes a table with RLS enabled AND a policy', () => {
    const migrations = {
      '001.sql': `
        create table public.todos (id uuid primary key, user_id uuid);
        alter table public.todos enable row level security;
        create policy "users own their todos" on public.todos
          for all using (auth.uid() = user_id);
      `,
    }
    const result = scanRls({ migrations })
    expect(result.findings).toHaveLength(0)
  })

  it('flags RLS enabled but no policies as high severity', () => {
    const migrations = {
      '001.sql': `
        create table public.locked_table (id uuid primary key);
        alter table public.locked_table enable row level security;
      `,
    }
    const result = scanRls({ migrations })
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({
      scanner: 'rls', severity: 'high', blocks_deploy: false,
    })
  })

  it('ignores auth and storage schemas', () => {
    const migrations = {
      '001.sql': `
        create table auth.users (id uuid);
        create table storage.objects (id uuid);
        create table public.todos (id uuid);
      `,
    }
    const result = scanRls({ migrations })
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]!.title).toContain('public.todos')
  })

  it('handles RLS enabled across migrations', () => {
    const migrations = {
      '001.sql': `create table public.todos (id uuid);`,
      '002.sql': `alter table public.todos enable row level security;
                  create policy "p1" on public.todos for select using (true);`,
    }
    const result = scanRls({ migrations })
    expect(result.findings).toHaveLength(0)
  })

  it('handles "if not exists" clause', () => {
    const migrations = {
      '001.sql': `create table if not exists public.todos (id uuid);`,
    }
    const result = scanRls({ migrations })
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]!.severity).toBe('critical')
  })

  it('de-duplicates the same table across multiple migrations', () => {
    const migrations = {
      '001.sql': `create table public.todos (id uuid);`,
      '002.sql': `create table if not exists public.todos (id uuid);`,
    }
    const result = scanRls({ migrations })
    expect(result.findings).toHaveLength(1) // not 2
  })

  it('flags multiple tables independently', () => {
    const migrations = {
      '001.sql': `
        create table public.todos (id uuid);
        create table public.posts (id uuid);
        alter table public.posts enable row level security;
        create policy "p1" on public.posts for all using (true);
      `,
    }
    const result = scanRls({ migrations })
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]!.title).toContain('public.todos')
  })

  it('is case-insensitive', () => {
    const migrations = {
      '001.sql': `CREATE TABLE PUBLIC.Todos (id uuid);
                  ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
                  CREATE POLICY "p" ON public.todos FOR ALL USING (true);`,
    }
    const result = scanRls({ migrations })
    expect(result.findings).toHaveLength(0)
  })

  it('reports duration_ms', () => {
    const result = scanRls({ migrations: {} })
    expect(result.duration_ms).toBeGreaterThanOrEqual(0)
    expect(result.scanner).toBe('rls')
  })
})
