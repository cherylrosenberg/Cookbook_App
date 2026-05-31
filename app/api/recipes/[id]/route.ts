import { NextRequest, NextResponse } from 'next/server'
import { RecipeInput } from '@/lib/supabase'
import {
  normalizeIngredients,
  normalizeRecipeIngredients,
} from '@/lib/recipe-normalize'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// GET single recipe
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Recipe not found' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json(normalizeRecipeIngredients(data))
  } catch (error) {
    console.error('Error fetching recipe:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    )
  }
}

// PUT update recipe
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = createServerSupabaseClient()
    const recipe: RecipeInput = await request.json()
    recipe.ingredients = normalizeIngredients(recipe.ingredients)

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
      .update({
        title: recipe.title,
        servings: servings,
        prep_time: recipe.prep_time || null,
        cook_time: recipe.cook_time || null,
        total_time: recipe.total_time || null,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        tags: recipe.tags || [],
        source_url: recipe.source_url || null,
        notes: recipe.notes || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Recipe not found' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json(normalizeRecipeIngredients(data))
  } catch (error) {
    console.error('Error updating recipe:', error)
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    )
  }
}

// DELETE recipe
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting recipe:', error)
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 }
    )
  }
}

