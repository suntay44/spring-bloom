/**
 * Design System Matcher
 *
 * Loads the vendored UI UX Pro Max CSV data at module load time and matches
 * a user prompt to a design system (product type → colors + style + typography).
 *
 * Strategy: tokenize prompt, score each product row by counting matches against
 * its `Keywords` column. Return top match if score ≥ 2.
 *
 * Data: data/design-systems/{products,colors,styles,typography,ux-guidelines}.csv
 * License: vendored from https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (MIT)
 */

import fs from 'node:fs'
import path from 'node:path'

export interface DesignSystem {
  productType: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    foreground: string
    card: string
    border: string
    ring: string
  }
  style: {
    name: string
    philosophy: string
    do_not_use_for: string
  }
  typography: {
    heading: string
    body: string
    css_import_url: string
  }
  keyConsiderations: string
}

// ── CSV parsing (tiny inline parser) ──────────────────────────────────────────

/**
 * Parse a single CSV line into an array of fields. Handles quoted fields with
 * commas and escaped double quotes ("").
 */
function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cur += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        out.push(cur)
        cur = ''
      } else {
        cur += ch
      }
    }
  }
  out.push(cur)
  return out
}

/**
 * Parse a CSV file into rows of {header → value} objects. Handles multi-line
 * quoted fields by tracking quote state across lines.
 */
function parseCsv(text: string): Record<string, string>[] {
  // First normalize line endings, then split logical rows respecting quotes.
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i]
    if (ch === '"') {
      // Toggle, accounting for escaped ""
      if (inQuotes && normalized[i + 1] === '"') {
        cur += '""'
        i++
        continue
      }
      inQuotes = !inQuotes
      cur += ch
    } else if (ch === '\n' && !inQuotes) {
      if (cur.length) rows.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur.length) rows.push(cur)

  if (!rows.length) return []
  const headers = parseCsvLine(rows[0]!)
  return rows.slice(1).map((row) => {
    const fields = parseCsvLine(row)
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => {
      obj[h] = (fields[idx] ?? '').trim()
    })
    return obj
  })
}

// ── Module-level cache ────────────────────────────────────────────────────────

interface CachedData {
  products: Record<string, string>[]
  colors: Record<string, string>[]
  styles: Record<string, string>[]
  typography: Record<string, string>[]
}

let CACHE: CachedData | null = null

function loadData(): CachedData {
  if (CACHE) return CACHE
  const dir = path.join(process.cwd(), 'data', 'design-systems')
  const read = (file: string): Record<string, string>[] => {
    try {
      return parseCsv(fs.readFileSync(path.join(dir, file), 'utf-8'))
    } catch (err) {
      console.error(`[design-matcher] Failed to load ${file}:`, err)
      return []
    }
  }
  CACHE = {
    products: read('products.csv'),
    colors: read('colors.csv'),
    styles: read('styles.csv'),
    typography: read('typography.csv'),
  }
  return CACHE
}

// ── Matcher ───────────────────────────────────────────────────────────────────

/**
 * Tokenize a prompt into lowercase words (length ≥ 3).
 */
function tokenize(prompt: string): Set<string> {
  return new Set(
    prompt
      .toLowerCase()
      .split(/[^a-z0-9-]+/)
      .filter((w) => w.length >= 3),
  )
}

/**
 * Match a user prompt to a design system. Returns null if no row scores ≥ 2.
 */
export function matchDesignSystem(prompt: string): DesignSystem | null {
  if (!prompt || typeof prompt !== 'string') return null
  const data = loadData()
  if (!data.products.length) return null

  const tokens = tokenize(prompt)
  if (!tokens.size) return null

  let bestScore = 0
  let bestRow: Record<string, string> | null = null
  let bestIndex = -1

  data.products.forEach((row, idx) => {
    const keywords = (row['Keywords'] ?? '')
      .toLowerCase()
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
    let score = 0
    for (const kw of keywords) {
      if (tokens.has(kw)) score++
      // also count multi-word keyword if prompt contains it
      else if (kw.includes('-') && prompt.toLowerCase().includes(kw)) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestRow = row
      bestIndex = idx
    }
  })

  if (!bestRow || bestScore < 2) return null

  const matchedRow: Record<string, string> = bestRow
  const productType = matchedRow['Product Type'] ?? 'Unknown'
  const styleName = (matchedRow['Primary Style Recommendation'] ?? '').split('+')[0]?.trim() ?? ''

  // Join colors by row index
  const colorRow = data.colors[bestIndex] ?? {}
  // Find a style row by name match (case-insensitive contains)
  const styleRow =
    data.styles.find((r) =>
      (r['Style Category'] ?? '').toLowerCase().includes(styleName.toLowerCase()),
    ) ?? data.styles[0] ?? {}

  // Pick a typography pairing. Try to match by "Best For" keywords against productType.
  const productLower = productType.toLowerCase()
  const typoRow =
    data.typography.find((r) =>
      (r['Best For'] ?? '').toLowerCase().split(/[,\s]+/).some(
        (w) => w.length > 3 && productLower.includes(w),
      ),
    ) ??
    data.typography.find((r) =>
      (r['Mood/Style Keywords'] ?? '').toLowerCase().includes('modern'),
    ) ??
    data.typography[0] ?? {}

  return {
    productType,
    colors: {
      primary: colorRow['Primary'] ?? '#7C3AED',
      secondary: colorRow['Secondary'] ?? '#A78BFA',
      accent: colorRow['Accent'] ?? '#0891B2',
      background: colorRow['Background'] ?? '#0a0712',
      foreground: colorRow['Foreground'] ?? '#f4f4f5',
      card: colorRow['Card'] ?? '#100a1c',
      border: colorRow['Border'] ?? '#2a2440',
      ring: colorRow['Ring'] ?? '#7C3AED',
    },
    style: {
      name: matchedRow['Primary Style Recommendation'] ?? '',
      philosophy: styleRow['Keywords'] ?? '',
      do_not_use_for: styleRow['Do Not Use For'] ?? '',
    },
    typography: {
      heading: typoRow['Heading Font'] ?? 'Inter',
      body: typoRow['Body Font'] ?? 'Inter',
      css_import_url: typoRow['Google Fonts URL'] ?? '',
    },
    keyConsiderations: matchedRow['Key Considerations'] ?? '',
  }
}
