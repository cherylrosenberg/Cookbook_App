import { SupabaseClient } from '@supabase/supabase-js'
import {
  EMBEDDING_DIM,
  EMBEDDING_MODEL,
  cosineSimilarity,
  embedQuery,
  parsePgVector,
  truncateForEmbedding,
  vectorToPostgres,
} from './embeddings'
import { normalizePantry } from './ingredient-normalize'
import type {
  PersonalRecipeMatch,
  RecipeChunkMatch,
  UserSettings,
} from './supabase'

export interface MatchPersonalRecipesOptions {
  /** When set, only recipes for this user; pre-auth: omit to search all rows. */
  userId?: string | null
  limit?: number
}

export interface MatchCorpusChunksOptions {
  limit?: number
  pantryTokens?: string[]
}

export function buildPantryTokens(
  pantry: string[],
  settings: UserSettings | null
): string[] {
  return normalizePantry(pantry, settings?.staple_ingredients ?? [])
}

/** Text sent to embedQuery for corpus search. */
export function buildRetrievalQueryText(
  query: string,
  pantryTokens: string[]
): string {
  const base = query.trim()
  if (pantryTokens.length === 0) return truncateForEmbedding(base)
  const pantryLine = `Available ingredients: ${pantryTokens.join(', ')}`
  return truncateForEmbedding(`${base}\n${pantryLine}`)
}

export async function matchPersonalRecipes(
  supabase: SupabaseClient,
  pantryTokens: string[],
  options: MatchPersonalRecipesOptions = {}
): Promise<PersonalRecipeMatch[]> {
  const limit = options.limit ?? 5
  if (pantryTokens.length === 0) return []

  let q = supabase
    .from('recipes')
    .select('id, title, ingredient_tokens, tags')

  if (options.userId) {
    q = q.eq('user_id', options.userId)
  }

  const { data, error } = await q
  if (error) throw error
  if (!data?.length) return []

  const pantrySet = new Set(pantryTokens)
  const scored = data
    .map((row) => {
      const tokens = (row.ingredient_tokens as string[]) ?? []
      const overlap_count = tokens.filter((t) => pantrySet.has(t)).length
      return {
        id: row.id as string,
        title: row.title as string,
        overlap_count,
        ingredient_tokens: tokens,
        tags: (row.tags as string[]) ?? [],
      }
    })
    .filter((r) => r.overlap_count > 0)
    .sort((a, b) => b.overlap_count - a.overlap_count)
    .slice(0, limit)

  return scored.map(({ id, title, overlap_count, ingredient_tokens }) => ({
    id,
    title,
    overlap_count,
    ingredient_tokens,
  }))
}

interface ChunkRowWithEmbedding {
  id: string
  source: RecipeChunkMatch['source']
  title: string
  content: string
  embedding: unknown
}

/**
 * Token filter first, then rank by similarity (matches SQL RPC semantics).
 * PostgREST does not bind filter_tokens text[] reliably on match_recipe_chunks.
 */
async function matchCorpusChunksByTokenOverlap(
  supabase: SupabaseClient,
  queryVector: number[],
  pantryTokens: string[],
  limit: number
): Promise<RecipeChunkMatch[]> {
  const { data, error } = await supabase
    .from('recipe_chunks')
    .select('id, source, title, content, embedding')
    .overlaps('ingredient_tokens', pantryTokens)

  if (error) throw error
  const candidates = (data ?? []) as ChunkRowWithEmbedding[]
  if (candidates.length === 0) return []

  const ranked = candidates
    .map((row) => {
      const embedding = parsePgVector(row.embedding)
      const similarity = cosineSimilarity(queryVector, embedding)
      return {
        id: row.id,
        source: row.source,
        title: row.title,
        content: row.content,
        similarity,
      } satisfies RecipeChunkMatch
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)

  return ranked
}

export async function matchCorpusChunks(
  supabase: SupabaseClient,
  queryText: string,
  options: MatchCorpusChunksOptions = {}
): Promise<RecipeChunkMatch[]> {
  const limit = options.limit ?? 5
  const pantryTokens =
    options.pantryTokens?.filter((t) => Boolean(t)) ?? []
  const hasTokenFilter = pantryTokens.length > 0

  const queryVector = await embedQuery(queryText)

  if (hasTokenFilter) {
    return matchCorpusChunksByTokenOverlap(
      supabase,
      queryVector,
      pantryTokens,
      limit
    )
  }

  const { data, error } = await supabase.rpc('match_recipe_chunks', {
    query_embedding: vectorToPostgres(queryVector),
    match_count: limit,
    filter_tokens: null,
  })

  if (error) throw error
  return (data ?? []) as RecipeChunkMatch[]
}

export const RETRIEVAL_META = {
  embed_model: EMBEDDING_MODEL,
  embed_dim: EMBEDDING_DIM,
} as const
