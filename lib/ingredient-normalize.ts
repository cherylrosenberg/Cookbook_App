import { IngredientSection } from './supabase'
import {
  isOptionalSectionName,
  normalizeIngredients,
} from './recipe-normalize'

export interface NormalizedIngredient {
  raw: string
  canonical: string
}

/** Maps common aliases to a single canonical token (no DB in PR1). */
export const DEFAULT_ALIASES: Record<string, string> = {
  scallion: 'green_onion',
  scallions: 'green_onion',
  'spring onion': 'green_onion',
  'spring onions': 'green_onion',
  'green onions': 'green_onion',
  cilantro: 'coriander',
  'ground beef': 'beef',
  'minced garlic': 'garlic',
  chickpeas: 'chickpea',
  tomatoes: 'tomato',
  onions: 'onion',
  potatoes: 'potato',
  carrots: 'carrot',
  lemons: 'lemon',
  limes: 'lime',
  eggs: 'egg',
}

const QUANTITY_PREFIX =
  /^[\d\s\/\.\,\-½¼¾⅓⅔⅛⅜⅝⅞]+(?:\s*(?:cups?|c\.|tbsp|tbs|tablespoons?|tsp|teaspoons?|oz|ounces?|lb|lbs|pounds?|g|grams?|kg|ml|l|liters?|litres?|pinch|cloves?|cans?|packages?|bunch(?:es)?|sprigs?|slices?|pieces?|large|medium|small|whole))?\s*/i

export function stripQuantityAndUnits(line: string): string {
  let text = line.trim()
  if (!text) return ''

  // Remove parenthetical notes at end: "butter (softened)"
  text = text.replace(/\s*\([^)]*\)\s*$/, '').trim()

  // Strip leading quantity + unit repeatedly for "1 1/2 cups" style
  let prev = ''
  while (text !== prev) {
    prev = text
    text = text.replace(QUANTITY_PREFIX, '').trim()
  }

  return text
}

export function toCanonicalToken(raw: string): string {
  const stripped = stripQuantityAndUnits(raw)
  if (!stripped) return ''

  let token = stripped
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/[\s-]+/g, ' ')
    .trim()
    .replace(/\s+/g, '_')

  if (!token) return ''

  if (token.endsWith('ies') && token.length > 4) {
    token = `${token.slice(0, -3)}y`
  } else if (token.endsWith('es') && token.length > 3) {
    const stem = token.slice(0, -2)
    if (stem.endsWith('sh') || stem.endsWith('ch') || stem.endsWith('x') || stem.endsWith('s')) {
      token = stem
    }
  } else if (token.endsWith('s') && !token.endsWith('ss') && token.length > 2) {
    token = token.slice(0, -1)
  }

  return token
}

export function resolveAlias(token: string): string {
  if (!token) return ''
  const key = token.replace(/_/g, ' ')
  if (DEFAULT_ALIASES[token]) return DEFAULT_ALIASES[token]
  if (DEFAULT_ALIASES[key]) return DEFAULT_ALIASES[key]
  return token
}

export function normalizeIngredientLine(raw: string): NormalizedIngredient {
  const trimmed = raw.trim()
  const base = toCanonicalToken(trimmed)
  const canonical = resolveAlias(base)
  return { raw: trimmed, canonical }
}

export function normalizePantry(
  lines: string[],
  staples: string[] = []
): string[] {
  const tokens = new Set<string>()
  for (const line of [...lines, ...staples]) {
    const { canonical } = normalizeIngredientLine(line)
    if (canonical) tokens.add(canonical)
  }
  return [...tokens].sort()
}

export function recipeToIngredientTokens(
  ingredients: IngredientSection[] | unknown
): string[] {
  const sections = normalizeIngredients(ingredients)
  const tokens = new Set<string>()

  for (const section of sections) {
    const sectionName = section.section?.trim() || ''
    if (isOptionalSectionName(sectionName)) continue
    if (sectionName === 'Optional ingredients') continue

    for (const item of section.items || []) {
      const line = item.ingredient?.trim()
      if (!line) continue
      const { canonical } = normalizeIngredientLine(line)
      if (canonical) tokens.add(canonical)
    }
  }

  return [...tokens].sort()
}
