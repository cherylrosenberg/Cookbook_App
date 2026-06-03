import { normalizeIngredientLine } from './ingredient-normalize'
import { truncateForEmbedding } from './embeddings'

export interface MartinezRow {
  rowIndex: number
  title: string
  ingredientLines: string[]
  directionLines: string[]
}

export interface RecipeChunkDraft {
  source: 'martinez'
  source_id: string
  title: string
  chunk_index: number
  content: string
  ingredient_tokens: string[]
}

const MAX_DIRECTION_CHARS = 4000

export function buildChunkContent(row: MartinezRow): string {
  const ingredients = row.ingredientLines.map((l) => `- ${l}`).join('\n')
  const directions = row.directionLines.map((l, i) => `${i + 1}. ${l}`).join('\n')
  let directionsBlock = directions
  if (directionsBlock.length > MAX_DIRECTION_CHARS) {
    directionsBlock = directionsBlock.slice(0, MAX_DIRECTION_CHARS) + '\n...'
  }

  const raw = [
    `Title: ${row.title}`,
    'Ingredients:',
    ingredients || '- (none listed)',
    'Directions:',
    directionsBlock || '(none listed)',
  ].join('\n')

  return truncateForEmbedding(raw)
}

export function ingredientTokensFromLines(lines: string[]): string[] {
  const tokens = new Set<string>()
  for (const line of lines) {
    const { canonical } = normalizeIngredientLine(line)
    if (canonical) tokens.add(canonical)
  }
  return [...tokens].sort()
}

export function martinezRowToChunk(row: MartinezRow): RecipeChunkDraft {
  return {
    source: 'martinez',
    source_id: `martinez-${row.rowIndex}`,
    title: row.title.trim() || `Recipe ${row.rowIndex}`,
    chunk_index: 0,
    content: buildChunkContent(row),
    ingredient_tokens: ingredientTokensFromLines(row.ingredientLines),
  }
}
