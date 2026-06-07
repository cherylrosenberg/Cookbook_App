import {
  formatIngredientForGapDisplay,
  ingredientMatchesPantryList,
  isAssumedOnHandIngredient,
  normalizePantry,
  parseIngredientLine,
} from './ingredient-normalize'
import { isOptionalSectionName, normalizeIngredients } from './recipe-normalize'
import type { RecipeInput, UserSettings } from './supabase'

/** Canonical primaries for staples (settings) — debug meta only. */
export function buildStapleTokens(settings: UserSettings | null): string[] {
  if (!settings?.staple_ingredients?.length) return []
  return normalizePantry([], settings.staple_ingredients)
}

export interface PantryGapResult {
  not_on_staples: string[]
}

/**
 * Flag main recipe ingredients not covered by staples.
 * Key ingredients are excluded — user is assumed to have those on hand.
 */
export function computePantryGaps(
  recipe: RecipeInput,
  stapleLines: string[],
  keyIngredientLines: string[]
): PantryGapResult {
  if (!stapleLines.length) return { not_on_staples: [] }

  const missing: string[] = []
  const seen = new Set<string>()

  const sections = normalizeIngredients(recipe.ingredients)
  for (const section of sections) {
    const sectionName = section.section?.trim() || ''
    if (isOptionalSectionName(sectionName)) continue
    if (sectionName === 'Optional ingredients') continue

    for (const item of section.items || []) {
      const line = item.ingredient?.trim()
      if (!line) continue

      if (isAssumedOnHandIngredient(line)) continue

      if (ingredientMatchesPantryList(line, keyIngredientLines)) continue
      if (ingredientMatchesPantryList(line, stapleLines)) continue

      const { primary } = parseIngredientLine(line)
      const dedupeKey = primary || line.toLowerCase()
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      missing.push(formatIngredientForGapDisplay(line))
    }
  }

  return { not_on_staples: missing }
}

export function formatPantryGapNote(gaps: PantryGapResult): string | null {
  if (!gaps.not_on_staples.length) return null
  const list = gaps.not_on_staples.join(', ')
  return `You may not have on hand: ${list}.`
}

const GAP_NOTE_PREFIX = 'You may not have on hand:'

function stripExistingPantryGapNotes(notes: string | undefined): string {
  if (!notes?.trim()) return ''
  return notes
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith(GAP_NOTE_PREFIX))
    .join('\n')
    .trim()
}

export function appendPantryGapToRecipeNotes(
  recipe: RecipeInput,
  gaps: PantryGapResult
): void {
  const base = stripExistingPantryGapNotes(recipe.notes)
  const gapNote = formatPantryGapNote(gaps)
  if (!gapNote) {
    recipe.notes = base || undefined
    return
  }
  recipe.notes = base ? `${base}\n\n${gapNote}` : gapNote
}
