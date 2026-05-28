#!/usr/bin/env tsx
/**
 * R5-1: Migration runner.
 *
 * Applies pending SQL migrations to the SpringBloom Supabase project via the
 * Management API's /database/query endpoint. Tracks state in a
 * `schema_migrations` table so re-runs are incremental.
 *
 * Usage:
 *   npx tsx scripts/apply-migrations.ts              → apply pending
 *   npx tsx scripts/apply-migrations.ts --dry        → list pending, no writes
 *   npx tsx scripts/apply-migrations.ts --force <n>  → re-run one
 *   npx tsx scripts/apply-migrations.ts --bootstrap  → mark ALL on disk as
 *                                                       already applied (no
 *                                                       writes to schema).
 *                                                       Run this ONCE the first
 *                                                       time, on a DB you've
 *                                                       been migrating manually.
 *
 * Requires (read from .env.local):
 *   SUPABASE_MANAGEMENT_TOKEN  — PAT with database query permission
 *   NEXT_PUBLIC_SUPABASE_URL   — used to derive the project ref
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { config as loadEnv } from 'dotenv'

// Load .env.local then .env (Next.js precedence)
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

const TOKEN = process.env.SUPABASE_MANAGEMENT_TOKEN
const URL   = process.env.NEXT_PUBLIC_SUPABASE_URL
const MIGRATIONS_DIR = path.resolve(process.cwd(), 'supabase/migrations')
const MGMT_BASE = 'https://api.supabase.com/v1'

// ─── Bootstrap ──────────────────────────────────────────────────────────────

if (!TOKEN) {
  console.error('✗ SUPABASE_MANAGEMENT_TOKEN is not set (check .env.local)')
  process.exit(1)
}
if (!URL) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL is not set (check .env.local)')
  process.exit(1)
}

const PROJECT_REF = (() => {
  try { return new globalThis.URL(URL).hostname.split('.')[0]! }
  catch { console.error('✗ NEXT_PUBLIC_SUPABASE_URL is malformed'); process.exit(1) }
})()

const args = process.argv.slice(2)
const DRY       = args.includes('--dry')
const FORCE     = args.includes('--force')
const BOOTSTRAP = args.includes('--bootstrap')
const FORCE_TARGET = FORCE ? args[args.indexOf('--force') + 1] : undefined

// ─── Helpers ────────────────────────────────────────────────────────────────

async function runSql(sql: string): Promise<unknown[]> {
  const res = await fetch(`${MGMT_BASE}/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${text}`)
  }
  // Supabase Management API returns the row array directly for SELECT,
  // or { rows: [...] } depending on the endpoint version. Handle both.
  const body = await res.json() as unknown
  if (Array.isArray(body)) return body
  if (body && typeof body === 'object' && Array.isArray((body as { rows?: unknown[] }).rows)) {
    return (body as { rows: unknown[] }).rows
  }
  return []
}

async function ensureMigrationTable(): Promise<void> {
  await runSql(`
    create table if not exists public.schema_migrations (
      name        text primary key,
      applied_at  timestamptz not null default now(),
      checksum    text
    );
  `)
}

async function listApplied(): Promise<Set<string>> {
  const rows = await runSql('select name from public.schema_migrations')
  const applied = new Set<string>()
  for (const row of rows) {
    const r = row as { name?: string }
    if (r.name) applied.add(r.name)
  }
  return applied
}

function listFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`✗ No migrations directory at ${MIGRATIONS_DIR}`)
    process.exit(1)
  }
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .filter((f) => !f.startsWith('ALL_'))      // skip combined catch-up files
    .sort()
}

function checksum(content: string): string {
  // Lightweight FNV-1a — no need for crypto for invalidation detection.
  let h = 2166136261
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}

async function applyMigration(name: string, sql: string): Promise<void> {
  // Run the migration body
  await runSql(sql)
  // Record success (PK conflict on re-apply — guarded above)
  const cs = checksum(sql)
  await runSql(`
    insert into public.schema_migrations (name, checksum)
    values ('${name.replace(/'/g, "''")}', '${cs}')
    on conflict (name) do update set checksum = excluded.checksum, applied_at = now();
  `)
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`→ Project ref: ${PROJECT_REF}`)
  console.log(`→ Migrations dir: ${MIGRATIONS_DIR}`)

  await ensureMigrationTable()
  const applied = await listApplied()
  const files = listFiles()

  if (BOOTSTRAP) {
    const toMark = files.filter((f) => !applied.has(f))
    if (toMark.length === 0) {
      console.log('✓ Nothing to bootstrap — all on-disk migrations already recorded')
      return
    }
    console.log(`▶ Bootstrap: marking ${toMark.length} migration(s) as already applied (no schema changes)`)
    for (const name of toMark) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8')
      const cs = checksum(sql)
      await runSql(`
        insert into public.schema_migrations (name, checksum)
        values ('${name.replace(/'/g, "''")}', '${cs}')
        on conflict (name) do nothing;
      `)
      console.log(`  · ${name}`)
    }
    console.log(`\n✓ Bootstrapped. Future runs will only apply NEW migrations.`)
    return
  }

  if (FORCE_TARGET) {
    const target = files.find((f) => f === FORCE_TARGET || f === `${FORCE_TARGET}.sql`)
    if (!target) { console.error(`✗ No such migration: ${FORCE_TARGET}`); process.exit(1) }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, target), 'utf8')
    console.log(`▶ Forcing re-apply: ${target}`)
    await applyMigration(target, sql)
    console.log(`✓ ${target}`)
    return
  }

  const pending = files.filter((f) => !applied.has(f))

  if (pending.length === 0) {
    console.log(`✓ All ${files.length} migration(s) already applied`)
    return
  }

  console.log(`\n${pending.length} pending migration${pending.length === 1 ? '' : 's'}:`)
  for (const p of pending) console.log(`  · ${p}`)

  if (DRY) {
    console.log('\n(dry run — no writes)')
    return
  }

  console.log('')
  for (const name of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8')
    process.stdout.write(`▶ ${name}... `)
    try {
      await applyMigration(name, sql)
      console.log('✓')
    } catch (err) {
      console.log('✗')
      console.error(`  ${err instanceof Error ? err.message : String(err)}`)
      console.error(`\nHalted at ${name}. Earlier migrations are still applied. Fix and re-run.`)
      process.exit(1)
    }
  }
  console.log(`\n✓ Applied ${pending.length} migration(s)`)
}

void main().catch((err) => {
  console.error('✗ Fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
