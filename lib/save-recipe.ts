import { SupabaseClient } from '@supabase/supabase-js'
import { recipeToIngredientTokens } from './ingredient-normalize'
import {
  normalizeIngredients,
  normalizeRecipeIngredients,
} from './recipe-normalize'
import { Recipe, RecipeInput } from './supabase'

export function validateRecipeInput(recipe: RecipeInput): string | null {
  if (!recipe.title?.trim() || !recipe.ingredients || !recipe.instructions) {
    return 'Missing required fields'
  }
  return null
}

export async function insertRecipeFromInput(
  supabase: SupabaseClient,
  recipe: RecipeInput
): Promise<Recipe> {
  const validationError = validateRecipeInput(recipe)
  if (validationError) {
    throw new Error(validationError)
  }

  recipe.ingredients = normalizeIngredients(recipe.ingredients)
  const ingredient_tokens = recipeToIngredientTokens(recipe.ingredients)
  const servings =
    recipe.servings && recipe.servings > 0 ? recipe.servings : 4

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      title: recipe.title,
      servings,
      prep_time: recipe.prep_time || null,
      cook_time: recipe.cook_time || null,
      total_time: recipe.total_time || null,
      ingredients: recipe.ingredients,
      ingredient_tokens,
      instructions: recipe.instructions,
      tags: recipe.tags || [],
      source_url: recipe.source_url || null,
      notes: recipe.notes || null,
    })
    .select()
    .single()

  if (error) throw error

  return normalizeRecipeIngredients(data) as Recipe
}
