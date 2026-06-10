import { NextRequest, NextResponse } from 'next/server'
import {
  estimateRecipeNutrition,
  getGenerationModelName,
} from '@/lib/gemini'
import {
  buildRecipeNutritionPayload,
  countMainIngredients,
} from '@/lib/nutrition'
import { normalizeRecipeIngredients } from '@/lib/recipe-normalize'
import { requireSupabaseEnv } from '@/lib/supabase-env'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const env = requireSupabaseEnv()
    if (!env.ok) return env.response

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const supabase = createServerSupabaseClient()
    const { data: recipe, error: fetchError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Recipe not found' },
          { status: 404 }
        )
      }
      throw fetchError
    }

    const normalized = normalizeRecipeIngredients(recipe)
    if (countMainIngredients(normalized) === 0) {
      return NextResponse.json(
        { error: 'Recipe has no main ingredients to estimate nutrition from' },
        { status: 400 }
      )
    }

    let estimate
    try {
      estimate = await estimateRecipeNutrition(normalized)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (msg.includes('503') || msg.toLowerCase().includes('overloaded')) {
        return NextResponse.json(
          {
            error:
              'Nutrition service is busy. Please wait a moment and try again.',
          },
          { status: 503 }
        )
      }
      if (msg.startsWith('Invalid nutrition')) {
        return NextResponse.json(
          { error: 'Could not parse nutrition estimate. Please try again.' },
          { status: 502 }
        )
      }
      throw err
    }

    const servings =
      normalized.servings && normalized.servings > 0 ? normalized.servings : 4
    const nutrition = buildRecipeNutritionPayload(
      estimate.per_serving,
      servings,
      getGenerationModelName(),
      {
        confidence: estimate.confidence,
        assumptions: estimate.assumptions,
      }
    )

    const { data: updated, error: updateError } = await supabase
      .from('recipes')
      .update({ nutrition })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      nutrition: normalizeRecipeIngredients(updated).nutrition,
    })
  } catch (error) {
    console.error('Error estimating nutrition:', error)
    return NextResponse.json(
      { error: 'Failed to estimate nutrition' },
      { status: 500 }
    )
  }
}
