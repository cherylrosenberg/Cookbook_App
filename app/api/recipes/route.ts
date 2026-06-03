import { NextRequest, NextResponse } from 'next/server'
import { RecipeInput } from '@/lib/supabase'
import { recipeToIngredientTokens } from '@/lib/ingredient-normalize'
import {
  normalizeIngredients,
  normalizeRecipeIngredients,
} from '@/lib/recipe-normalize'
import { requireSupabaseEnv } from '@/lib/supabase-env'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// GET all recipes
export async function GET() {
  try {
    const env = requireSupabaseEnv()
    if (!env.ok) return env.response

    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    const recipes = (data || []).map(normalizeRecipeIngredients)
    return NextResponse.json(recipes)
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch recipes' },
      { status: 500 }
    )
  }
}

// POST create new recipe
export async function POST(request: NextRequest) {
  try {
    const env = requireSupabaseEnv()
    if (!env.ok) return env.response

    const supabase = createServerSupabaseClient()
    const recipe: RecipeInput = await request.json()
    recipe.ingredients = normalizeIngredients(recipe.ingredients)
    const ingredient_tokens = recipeToIngredientTokens(recipe.ingredients)

    // Validate required fields
    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Ensure servings is a valid number, default to 4 only if missing or 0
    const servings = (recipe.servings && recipe.servings > 0) ? recipe.servings : 4

    const { data, error } = await supabase
      .from('recipes')
      .insert({
        title: recipe.title,
        servings: servings,
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

    if (error) {
      throw error
    }

    return NextResponse.json(normalizeRecipeIngredients(data), { status: 201 })
  } catch (error) {
    console.error('Error creating recipe:', error)
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    )
  }
}

