import { NextRequest, NextResponse } from 'next/server'
import { getGenerationModelName, generateRecipeFromContext } from '@/lib/gemini'
import {
  EMBEDDING_DIM,
  EMBEDDING_MODEL,
} from '@/lib/embeddings'
import {
  buildPantryTokens,
  buildRetrievalQueryText,
  matchCorpusChunks,
  matchPersonalRecipes,
} from '@/lib/recipe-retrieval'
import { GenerateRecipeRequest } from '@/lib/supabase'
import { requireSupabaseEnv } from '@/lib/supabase-env'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSettingsForRequest } from '@/lib/user-settings'

const DEFAULT_PERSONAL_MATCH = 5
const DEFAULT_CORPUS_MATCH = 5

export async function POST(request: NextRequest) {
  try {
    const env = requireSupabaseEnv()
    if (!env.ok) return env.response

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const body = (await request.json()) as GenerateRecipeRequest
    const query = body.query?.trim()
    if (!query) {
      return NextResponse.json(
        { error: 'Missing required field: query' },
        { status: 400 }
      )
    }

    const hasFeedback = body.feedback !== undefined && body.feedback !== null
    const hasPrevious = body.previous_recipe !== undefined && body.previous_recipe !== null
    if (hasFeedback !== hasPrevious) {
      return NextResponse.json(
        {
          error:
            'Refinement requires both feedback and previous_recipe, or neither',
        },
        { status: 400 }
      )
    }
    const feedback = body.feedback?.trim() ?? ''
    const isRefinement = hasFeedback && hasPrevious
    if (isRefinement && !feedback) {
      return NextResponse.json(
        { error: 'Refinement feedback cannot be empty' },
        { status: 400 }
      )
    }

    const includeUserSettings = body.include_user_settings !== false
    const personalMatchCount =
      body.personal_match_count ?? DEFAULT_PERSONAL_MATCH
    const corpusMatchCount = body.corpus_match_count ?? DEFAULT_CORPUS_MATCH
    const pantry = Array.isArray(body.pantry) ? body.pantry : []

    const supabase = createServerSupabaseClient()

    // Pre-auth: userId from session when auth exists (not from client body).
    const userId: string | null = null

    const settings = includeUserSettings
      ? await getSettingsForRequest(supabase, { userId })
      : null

    const pantryTokens = buildPantryTokens(pantry, settings)
    const retrievalQuery = buildRetrievalQueryText(
      query,
      pantryTokens,
      isRefinement ? feedback : undefined
    )

    const [personalMatches, corpusMatches] = await Promise.all([
      matchPersonalRecipes(supabase, pantryTokens, {
        userId,
        limit: personalMatchCount,
      }),
      matchCorpusChunks(supabase, retrievalQuery, {
        limit: corpusMatchCount,
        pantryTokens,
      }).catch((err) => {
        console.error('Corpus retrieval failed:', err)
        return [] as Awaited<ReturnType<typeof matchCorpusChunks>>
      }),
    ])

    const corpusWarning =
      corpusMatches.length === 0
        ? 'No corpus matches found. Run ingest:martinez or widen pantry/query.'
        : undefined

    const recipe = await generateRecipeFromContext({
      query,
      pantryTokens,
      settings,
      personalMatches,
      corpusMatches,
      ...(isRefinement
        ? { feedback, previousRecipe: body.previous_recipe }
        : {}),
    })

    const inspirationTitles = [
      ...new Set([
        ...personalMatches.map((m) => m.title),
        ...corpusMatches.map((m) => m.title),
      ]),
    ]

    return NextResponse.json({
      recipe,
      personal_matches: personalMatches,
      corpus_matches: corpusMatches,
      meta: {
        pantry_tokens: pantryTokens,
        embed_model: EMBEDDING_MODEL,
        embed_dim: EMBEDDING_DIM,
        generation_model: getGenerationModelName(),
        ...(isRefinement ? { refinement: true } : {}),
        ...(corpusWarning ? { corpus_warning: corpusWarning } : {}),
        ...(inspirationTitles.length
          ? { sources_inspiration: inspirationTitles }
          : {}),
      },
    })
  } catch (error) {
    console.error('Error generating recipe:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to generate recipe',
      },
      { status: 500 }
    )
  }
}
