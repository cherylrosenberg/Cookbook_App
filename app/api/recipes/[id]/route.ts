import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { RecipeInput } from '@/lib/supabase'

// Create Supabase client for server-side API routes
// Support both anon key (legacy) and publishable key (new format)
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseAnonKey = 
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY || 
  ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// GET single recipe
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', params.id)
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

    return NextResponse.json(data)
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
  { params }: { params: { id: string } }
) {
  try {
    const recipe: RecipeInput = await request.json()

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
      .eq('id', params.id)
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

    return NextResponse.json(data)
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
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', params.id)

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

