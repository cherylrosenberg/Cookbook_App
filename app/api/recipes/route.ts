import { NextRequest, NextResponse } from 'next/server'
import { RecipeInput } from '@/lib/supabase'
import { insertRecipeFromInput } from '@/lib/save-recipe'
import { normalizeRecipeIngredients } from '@/lib/recipe-normalize'
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

    try {
      const saved = await insertRecipeFromInput(supabase, recipe)
      return NextResponse.json(saved, { status: 201 })
    } catch (err) {
      if (err instanceof Error && err.message === 'Missing required fields') {
        return NextResponse.json({ error: err.message }, { status: 400 })
      }
      throw err
    }
  } catch (error) {
    console.error('Error creating recipe:', error)
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    )
  }
}

