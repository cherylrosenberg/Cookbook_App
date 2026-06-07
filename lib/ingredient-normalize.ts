import { IngredientSection } from './supabase'
import {
  isOptionalSectionName,
  normalizeIngredients,
} from './recipe-normalize'

export const MIN_MATCH_TOKEN_LEN = 3

export interface ParsedIngredient {
  raw: string
  /** Stable ID for DB / retrieval (one per line). */
  primary: string
  /** Flexible tokens for pantry / on-hand matching. */
  matchTokens: string[]
}

/** @deprecated Use ParsedIngredient.primary */
export interface NormalizedIngredient extends ParsedIngredient {
  canonical: string
}

/** Maps common aliases to a single token (do not collapse distinct peppers). */
export const DEFAULT_ALIASES: Record<string, string> = {
  scallion: 'green_onion',
  scallions: 'green_onion',
  'spring onion': 'green_onion',
  'spring onions': 'green_onion',
  'green onions': 'green_onion',
  cilantro: 'coriander',
  'ground beef': 'beef',
  'minced garlic': 'garlic',
  garlic_minced: 'garlic',
  chickpeas: 'chickpea',
  tomatoes: 'tomato',
  onions: 'onion',
  potatoes: 'potato',
  carrots: 'carrot',
  lemons: 'lemon',
  limes: 'lime',
  eggs: 'egg',
  peppers: 'bell_pepper',
  bell_peppers: 'bell_pepper',
}

/** Standalone prep/descriptor segments — not food names. */
const PREP_MODIFIER_SEGMENTS = new Set([
  'minced',
  'diced',
  'sliced',
  'chopped',
  'crushed',
  'ground',
  'fresh',
  'dried',
  'frozen',
  'canned',
  'kosher',
  'extra',
  'virgin',
  'large',
  'medium',
  'small',
  'whole',
  'boneless',
  'skinless',
  'finely',
  'roughly',
  'thinly',
  'thickly',
  'warm',
  'hot',
  'cold',
  'cool',
  'boiling',
  'ice',
])

/** Always assumed available — pantry gap and optional primary normalization. */
export const ASSUMED_ON_HAND_TOKENS = new Set([
  'water',
  'oil',
  'olive_oil',
  'vegetable_oil',
  'cooking_oil',
])

/** Compound foods: primary must stay specific (never collapse to bare pepper). */
export const COMPOUND_FOOD_TOKENS = new Set([
  'black_pepper',
  'bell_pepper',
  'red_pepper',
  'green_pepper',
  'cayenne_pepper',
  'jalapeno_pepper',
  'serrano_pepper',
  'white_pepper',
  'black_beans',
  'green_beans',
  'kidney_beans',
  'pinto_beans',
])

const PEPPER_PREFIX =
  /^(black|bell|red|green|cayenne|jalapeno|serrano|white)_pepper$/

/** Spice peppers covered by staple "pepper" — not bell or other vegetables. */
const SPICE_PEPPER_PRIMARIES = new Set(['black_pepper', 'white_pepper', 'pepper'])

function staplePepperMatchesRecipePrimary(
  pantryPrimary: string,
  recipePrimary: string
): boolean {
  return (
    pantryPrimary === 'pepper' &&
    Boolean(recipePrimary) &&
    SPICE_PEPPER_PRIMARIES.has(recipePrimary)
  )
}

const QUANTITY_PREFIX =
  /^[\d\s\/\.\,\-½¼¾⅓⅔⅛⅜⅝⅞]+(?:\s*(?:cups?|c\.|tbsp|tbs|tablespoons?|tsp|teaspoons?|oz|ounces?|lb|lbs|pounds?|g|grams?|kg|ml|l|liters?|litres?|pinch|cloves?|cans?|packages?|bunch(?:es)?|sprigs?|slices?|pieces?|large|medium|small|whole))?\s*/i

/** Comma clause after the food name that is prep, not a separate ingredient. */
const PREP_CLAUSE_START =
  /^(cut|diced|sliced|chopped|minced|crushed|julienned|torn|drained|rinsed|peeled|seeded|halved|quartered|shredded|grated|mashed|beaten|whisked|softened|thawed|trimmed|deveined|cored|pitted)\b/i

/** Short label for pantry-gap lists — no quantities or prep instructions. */
export function formatIngredientForGapDisplay(raw: string): string {
  let text = stripQuantityAndUnits(raw)
  if (!text) return raw.trim()

  text = text.replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()

  const commaIdx = text.indexOf(',')
  if (commaIdx >= 0) {
    const after = text.slice(commaIdx + 1).trim()
    if (PREP_CLAUSE_START.test(after)) {
      text = text.slice(0, commaIdx).trim()
    }
  }

  return text || raw.trim()
}

export function stripQuantityAndUnits(line: string): string {
  let text = line.trim()
  if (!text) return ''

  text = text.replace(/\s*\([^)]*\)\s*$/, '').trim()

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

  // Plural vegetable peppers — not ground spice (singular pepper stays pepper).
  if (token === 'peppers') return 'bell_pepper'

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

function isCompoundFoodToken(token: string): boolean {
  if (!token) return false
  if (COMPOUND_FOOD_TOKENS.has(token)) return true
  return PEPPER_PREFIX.test(token)
}

function splitSegments(fullToken: string): string[] {
  return fullToken
    .split('_')
    .map((s) => s.trim())
    .filter((s) => s.length >= MIN_MATCH_TOKEN_LEN)
}

function stripPrepSegments(segments: string[]): string[] {
  const food = segments.filter((s) => !PREP_MODIFIER_SEGMENTS.has(s))
  return food.length > 0 ? food : segments
}

function addToken(set: Set<string>, token: string) {
  const t = resolveAlias(token)
  if (t && t.length >= 2) set.add(t)
}

function shouldIncludeSegment(
  segment: string,
  resolvedFull: string
): boolean {
  if (PEPPER_PREFIX.test(resolvedFull) && segment === 'pepper') {
    return false
  }
  return true
}

function buildMatchTokenSetFromCanonical(fullToken: string): Set<string> {
  const out = new Set<string>()
  if (!fullToken) return out

  const resolvedFull = resolveAlias(fullToken)
  addToken(out, resolvedFull)

  const segments = splitSegments(fullToken)
  for (const seg of segments) {
    if (shouldIncludeSegment(seg, resolvedFull)) addToken(out, seg)
  }

  const afterPrep = stripPrepSegments(segments)
  if (afterPrep.length >= 2) {
    const joined = afterPrep.map((s) => resolveAlias(s)).join('_')
    addToken(out, joined)
    for (const seg of afterPrep) {
      if (shouldIncludeSegment(seg, resolvedFull)) addToken(out, seg)
    }
  } else if (afterPrep.length === 1) {
    addToken(out, afterPrep[0])
  }

  for (const t of [...out]) {
    if (isCompoundFoodToken(t)) addToken(out, t)
  }

  return out
}

function prepStrippedCompound(fullToken: string): string | null {
  const segments = splitSegments(fullToken)
  const food = stripPrepSegments(segments)
  if (food.length === 0) return null
  const joined = food.map((s) => resolveAlias(s)).join('_')
  if (isCompoundFoodToken(joined)) return joined
  if (isCompoundFoodToken(resolveAlias(joined))) return resolveAlias(joined)
  return null
}

/** Choose one primary token for DB / retrieval. */
export function pickPrimary(matchTokens: Set<string>, fullToken: string): string {
  const resolvedFull = resolveAlias(fullToken)
  if (!resolvedFull) return ''

  for (const t of matchTokens) {
    if (isCompoundFoodToken(t)) return t
  }

  const fromPrep = prepStrippedCompound(fullToken)
  if (fromPrep) return fromPrep

  for (const t of matchTokens) {
    const aliasTarget = DEFAULT_ALIASES[t] ?? DEFAULT_ALIASES[t.replace(/_/g, ' ')]
    if (aliasTarget && aliasTarget !== t && matchTokens.has(aliasTarget)) {
      return aliasTarget
    }
  }

  const candidates = [...matchTokens].filter(
    (t) => !PREP_MODIFIER_SEGMENTS.has(t) && t.length >= MIN_MATCH_TOKEN_LEN
  )
  if (candidates.length > 0) {
    const assumed = candidates.filter((t) => ASSUMED_ON_HAND_TOKENS.has(t))
    if (assumed.length > 0) {
      assumed.sort((a, b) => a.length - b.length)
      return assumed[0]
    }
    candidates.sort((a, b) => a.length - b.length)
    return candidates[0]
  }

  return resolvedFull
}

/** Tap water, warm water, etc. — not flagged as missing from staples. */
export function isAssumedOnHandIngredient(raw: string): boolean {
  const { primary, matchTokens } = parseIngredientLine(raw)
  if (primary && ASSUMED_ON_HAND_TOKENS.has(primary)) return true
  return matchTokens.some((t) => ASSUMED_ON_HAND_TOKENS.has(t))
}

/** Single parse: matchTokens + primary. */
export function parseIngredientLine(raw: string): ParsedIngredient {
  const trimmed = raw.trim()
  const fullToken = toCanonicalToken(trimmed)
  const matchSet = buildMatchTokenSetFromCanonical(fullToken)
  const primary = pickPrimary(matchSet, fullToken)

  return {
    raw: trimmed,
    primary,
    matchTokens: [...matchSet].sort(),
  }
}

export function normalizeIngredientLine(raw: string): NormalizedIngredient {
  const parsed = parseIngredientLine(raw)
  return {
    ...parsed,
    canonical: parsed.primary,
  }
}

export function normalizePantry(
  lines: string[],
  staples: string[] = []
): string[] {
  const tokens = new Set<string>()
  for (const line of [...lines, ...staples]) {
    const { primary } = parseIngredientLine(line)
    if (primary) tokens.add(primary)
  }
  return [...tokens].sort()
}

export function buildMatchTokenSet(lines: string[]): Set<string> {
  const out = new Set<string>()
  for (const line of lines) {
    const { matchTokens } = parseIngredientLine(line)
    for (const t of matchTokens) out.add(t)
  }
  return out
}

function tokenSetsOverlap(a: Set<string>, b: Set<string>): boolean {
  for (const t of a) {
    if (b.has(t)) return true
  }
  return false
}

/** Bare staple pepper must not match bell_pepper via substring (spice match is explicit). */
function strictTokenOverlap(recipeTokens: Set<string>, pantryTokens: Set<string>): boolean {
  if (tokenSetsOverlap(recipeTokens, pantryTokens)) return true

  for (const p of pantryTokens) {
    if (p.length < MIN_MATCH_TOKEN_LEN) continue
    for (const r of recipeTokens) {
      if (r.length < MIN_MATCH_TOKEN_LEN) continue
      if (r === p) return true
      if (p === 'pepper' || r === 'pepper') continue
      if (r.includes(p) || p.includes(r)) return true
    }
  }
  return false
}

export function ingredientMatchesPantryList(
  recipeRaw: string,
  pantryLines: string[]
): boolean {
  if (!pantryLines.length) return false

  const recipe = parseIngredientLine(recipeRaw)
  if (!recipe.primary && recipe.matchTokens.length === 0) return false

  const recipeSet = new Set(recipe.matchTokens)
  if (recipe.primary) recipeSet.add(recipe.primary)

  for (const line of pantryLines) {
    const pantry = parseIngredientLine(line)
    if (!pantry.primary && pantry.matchTokens.length === 0) continue

    if (recipe.primary && pantry.primary && recipe.primary === pantry.primary) {
      return true
    }

    if (
      staplePepperMatchesRecipePrimary(pantry.primary, recipe.primary)
    ) {
      return true
    }

    const pantrySet = new Set(pantry.matchTokens)
    if (pantry.primary) pantrySet.add(pantry.primary)

    if (strictTokenOverlap(recipeSet, pantrySet)) return true
  }

  return false
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
      const { primary } = parseIngredientLine(line)
      if (primary) tokens.add(primary)
    }
  }

  return [...tokens].sort()
}
