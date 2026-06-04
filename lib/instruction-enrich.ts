import { IngredientSection, RecipeInput } from './supabase'
import { parseQuantity } from './quantity-parser'

/** Words stripped when building match keys (not removed from display names). */
const MATCH_STOP_WORDS = new Set([
  'fresh',
  'dried',
  'chopped',
  'minced',
  'sliced',
  'diced',
  'grated',
  'crushed',
  'ground',
  'whole',
  'large',
  'medium',
  'small',
  'optional',
  'boneless',
  'skinless',
  'trimmed',
  'packed',
  'heaping',
])

const NON_QUANTIFIABLE = /^(to taste|as needed|for garnish|optional)$/i

const QUANTITY_TOKEN =
  '(?:[¼½¾⅓⅔⅛⅜⅝⅞]|[\\d]+(?:\\.[\\d]+)?(?:\\s*\\/\\s*[\\d]+)?)'

const UNIT_TOKEN =
  '(?:cups?|c\\.?|tablespoons?|tbsp|tbs|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|lb|grams?|g|kg|milliliters?|ml|liters?|litres?|l|cloves?|cans?|packages?|bunch(?:es)?|sprigs?|slices?|pieces?|pinch(?:es)?|dash(?:es)?)'

const QUANTITY_PHRASE = new RegExp(
  `${QUANTITY_TOKEN}(?:\\s*${UNIT_TOKEN})?(?:\\s+(?:large|medium|small|whole))?`,
  'gi'
)

interface IngredientRef {
  ingredient: string
  quantity: string
  matchRegex: RegExp
  fullIntroduced: boolean
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function ingredientMatchPhrase(raw: string): string | null {
  let text = raw
    .trim()
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return null

  const words = text.split(/\s+/).filter((w) => !MATCH_STOP_WORDS.has(w.toLowerCase()))
  const phrase = (words.length >= 2 ? words.slice(-3) : words).join(' ').trim()
  return phrase.length >= 2 ? phrase : text.length >= 2 ? text : null
}

function buildIngredientRegex(phrase: string): RegExp {
  return new RegExp(`\\b${escapeRegex(phrase)}\\b`, 'i')
}

function collectIngredientRefs(sections: IngredientSection[]): IngredientRef[] {
  const refs: IngredientRef[] = []
  const seenPhrases = new Set<string>()

  for (const section of sections) {
    for (const item of section.items ?? []) {
      const ingredient = item.ingredient?.trim()
      const quantity = item.quantity?.trim() ?? ''
      if (!ingredient || !quantity || NON_QUANTIFIABLE.test(quantity)) continue

      const phrase = ingredientMatchPhrase(ingredient)
      if (!phrase) continue
      const key = phrase.toLowerCase()
      if (seenPhrases.has(key)) continue
      seenPhrases.add(key)

      refs.push({
        ingredient,
        quantity,
        matchRegex: buildIngredientRegex(phrase),
        fullIntroduced: false,
      })
    }
  }

  return refs.sort((a, b) => b.ingredient.length - a.ingredient.length)
}

function quantityBeforeIndex(text: string, matchIndex: number): string | null {
  const before = text.slice(0, matchIndex)
  const window = before.slice(Math.max(0, before.length - 80))
  const matches = [...window.matchAll(QUANTITY_PHRASE)]
  if (!matches.length) return null
  return matches[matches.length - 1][0].trim()
}

function unitsCompatible(a: string, b: string): boolean {
  if (!a || !b) return true
  const norm = (u: string) =>
    u
      .toLowerCase()
      .replace(/s$/, '')
      .replace(/^c$/, 'cup')
      .replace(/^lb$/, 'pound')
      .replace(/^oz$/, 'ounce')
  return norm(a) === norm(b)
}

function isPartialQuantity(instructionQty: string, listQty: string): boolean {
  const instr = instructionQty.trim()
  if (/\bhalf\b/i.test(instr) || /\bhalf of\b/i.test(instr)) return true

  if (/[¼½¾⅓⅔⅛⅜⅝⅞]/.test(instr) || /\d+\s*\/\s*\d+/.test(instr)) {
    const listParsed = parseQuantity(listQty)
    const instrParsed = parseQuantity(instr)
    if (listParsed.value > 0 && instrParsed.value > 0) {
      if (
        unitsCompatible(instrParsed.unit, listParsed.unit) &&
        instrParsed.value < listParsed.value * 0.99
      ) {
        return true
      }
    } else {
      return true
    }
  }

  const listParsed = parseQuantity(listQty)
  const instrParsed = parseQuantity(instr)
  if (listParsed.value > 0 && instrParsed.value > 0) {
    if (
      unitsCompatible(instrParsed.unit, listParsed.unit) &&
      instrParsed.value < listParsed.value * 0.99
    ) {
      return true
    }
  }

  return false
}

/** One pass over a single instruction line; mutates ref.fullIntroduced. */
function enrichInstructionLine(line: string, refs: IngredientRef[]): string {
  let result = line

  for (const ref of refs) {
    ref.matchRegex.lastIndex = 0
    const match = ref.matchRegex.exec(result)
    if (!match || match.index === undefined) continue

    const qtyBefore = quantityBeforeIndex(result, match.index)

    if (qtyBefore) {
      if (!isPartialQuantity(qtyBefore, ref.quantity)) {
        ref.fullIntroduced = true
      }
      continue
    }

    if (ref.fullIntroduced) continue

    result =
      result.slice(0, match.index) +
      `${ref.quantity} ` +
      result.slice(match.index)
    ref.fullIntroduced = true
  }

  return result
}

/**
 * Adds each ingredient's list quantity on the first instruction mention that
 * does not already include a (full or partial) quantity. Partial amounts in a
 * step are left unchanged; full quantities are not repeated on later steps.
 */
export function enrichRecipeInstructions(recipe: RecipeInput): RecipeInput {
  if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) {
    return recipe
  }

  const refs = collectIngredientRefs(recipe.ingredients ?? [])
  if (!refs.length) return recipe

  const instructions = recipe.instructions.map((line) => {
    const numPrefix = line.match(/^(\d+[\.\)]\s*)/)?.[1] ?? ''
    const body = line.replace(/^\d+[\.\)]\s*/, '').trim()
    if (!body) return line
    const enrichedBody = enrichInstructionLine(body, refs)
    return numPrefix ? `${numPrefix}${enrichedBody}` : enrichedBody
  })

  return { ...recipe, instructions }
}
