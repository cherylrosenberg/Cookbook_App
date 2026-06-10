import { isOptionalSectionName, normalizeIngredients } from './recipe-normalize'
import type {
  NutritionPerServing,
  Recipe,
  RecipeInput,
  RecipeNutrition,
} from './supabase'

type RecipeForNutrition = Pick<Recipe, 'servings' | 'ingredients' | 'title'> &
  Partial<Pick<Recipe, 'updated_at' | 'nutrition'>>

/** Flatten main ingredient lines for the nutrition prompt (skip optional sections). */
export function formatRecipeIngredientsForNutrition(
  recipe: RecipeForNutrition | RecipeInput
): string[] {
  const lines: string[] = []
  const sections = normalizeIngredients(recipe.ingredients)

  for (const section of sections) {
    const sectionName = section.section?.trim() || ''
    if (isOptionalSectionName(sectionName)) continue
    if (sectionName === 'Optional ingredients') continue

    for (const item of section.items ?? []) {
      const ingredient = item.ingredient?.trim()
      if (!ingredient) continue
      const qty = item.quantity?.trim()
      lines.push(qty ? `${qty} ${ingredient}` : ingredient)
    }
  }

  return lines
}

export function countMainIngredients(
  recipe: RecipeForNutrition | RecipeInput
): number {
  return formatRecipeIngredientsForNutrition(recipe).length
}

function roundMacro(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function roundCalories(value: number): number {
  return Math.round(value)
}

export function scaleNutritionPerServing(
  perServing: NutritionPerServing,
  multiplier: number
): NutritionPerServing {
  if (multiplier === 1) return perServing

  const scale = (n: number, decimals = 1) => roundMacro(n * multiplier, decimals)

  return {
    calories: roundCalories(perServing.calories * multiplier),
    protein_g: scale(perServing.protein_g),
    fat_g: scale(perServing.fat_g),
    carbohydrates_g: scale(perServing.carbohydrates_g),
    ...(perServing.fiber_g != null
      ? { fiber_g: scale(perServing.fiber_g) }
      : {}),
    ...(perServing.sugar_g != null
      ? { sugar_g: scale(perServing.sugar_g) }
      : {}),
    ...(perServing.sodium_mg != null
      ? { sodium_mg: roundCalories(perServing.sodium_mg * multiplier) }
      : {}),
  }
}

export function isNutritionStale(recipe: Recipe): boolean {
  const nutrition = recipe.nutrition
  if (!nutrition) return false

  if (recipe.servings !== nutrition.servings_basis) return true

  const updated = new Date(recipe.updated_at).getTime()
  const estimated = new Date(nutrition.estimated_at).getTime()
  if (!Number.isNaN(updated) && !Number.isNaN(estimated) && updated > estimated) {
    return true
  }

  return false
}

export function buildRecipeNutritionPayload(
  perServing: NutritionPerServing,
  servings: number,
  model: string,
  options?: {
    confidence?: RecipeNutrition['confidence']
    assumptions?: string[]
  }
): RecipeNutrition {
  return {
    per_serving: perServing,
    servings_basis: servings,
    method: 'gemini_estimate',
    model,
    confidence: options?.confidence,
    assumptions: options?.assumptions,
    estimated_at: new Date().toISOString(),
    disclaimer:
      'AI-estimated nutrition per serving. Not medical or dietary advice.',
  }
}
