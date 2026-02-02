import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { RecipeInput } from '@/lib/supabase'

// Create Supabase client for server-side API routes
// Support both anon key (legacy) and publishable key (new format)
// Use placeholders when env is missing so build (static analysis) does not throw
function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'placeholder-key'
  return createClient(supabaseUrl, supabaseAnonKey)
}

// GET all recipes
export async function GET() {
  try {
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_PUBLISHABLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) in .env.local' },
        { status: 500 }
      )
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    return NextResponse.json(data || [])
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
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_PUBLISHABLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) in .env.local' },
        { status: 500 }
      )
    }

    const supabase = getSupabase()
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
      .insert({
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
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating recipe:', error)
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    )
  }
}

