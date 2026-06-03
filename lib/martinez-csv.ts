import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'
import type { MartinezRow } from './recipe-chunk'

/** Parse a CSV field that may be JSON array, Python-style list string, or plain text. */
export function parseListField(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  const trimmed = raw.trim()

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed.replace(/'/g, '"')) as unknown
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x).trim()).filter(Boolean)
      }
    } catch {
      // fall through
    }
  }

  if (trimmed.includes('\n')) {
    return trimmed.split('\n').map((l) => l.trim()).filter(Boolean)
  }

  if (trimmed.includes('|')) {
    return trimmed.split('|').map((l) => l.trim()).filter(Boolean)
  }

  return [trimmed]
}

function pickColumn(row: Record<string, string>, names: string[]): string {
  for (const name of names) {
    const key = Object.keys(row).find((k) => k.toLowerCase() === name.toLowerCase())
    if (key && row[key]?.trim()) return row[key]
  }
  return ''
}

/**
 * Parse CSV with RFC 4180 rules (quoted fields, multiline cells, escaped quotes).
 */
export function parseCsv(content: string): Record<string, string>[] {
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  }) as Record<string, string>[]
}

export function loadMartinezRows(
  filePath: string,
  options: { offset?: number; limit?: number }
): MartinezRow[] {
  const content = readFileSync(filePath, 'utf8')
  const records = parseCsv(content)
  const offset = options.offset ?? 0
  const limit = options.limit ?? records.length

  const slice = records.slice(offset, offset + limit)
  return slice.map((record, i) => {
    const rowIndex = offset + i
    const title = pickColumn(record, ['title', 'Title', 'name', 'Name'])
    const ingredientsRaw = pickColumn(record, [
      'ingredients',
      'Ingredients',
      'ingredient',
      'Cleaned_Ingredients',
    ])
    const directionsRaw = pickColumn(record, [
      'instructions',
      'Instructions',
      'directions',
      'Directions',
      'steps',
    ])

    return {
      rowIndex,
      title: title || `Recipe ${rowIndex}`,
      ingredientLines: parseListField(ingredientsRaw),
      directionLines: parseListField(directionsRaw),
    }
  })
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
