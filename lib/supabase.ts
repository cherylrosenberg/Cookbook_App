// Types for recipes (DB and API). Server client: lib/supabase-server.ts

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

export interface NutritionPerServing {
  calories: number
  protein_g: number
  fat_g: number
  carbohydrates_g: number
  fiber_g?: number
  sugar_g?: number
  sodium_mg?: number
}

export interface RecipeNutrition {
  per_serving: NutritionPerServing
  servings_basis: number
  method: 'gemini_estimate'
  model: string
  confidence?: 'low' | 'medium' | 'high'
  assumptions?: string[]
  estimated_at: string
  disclaimer: string
}

export const NUTRITION_DISCLAIMER =
  'AI-estimated nutrition per serving. Not medical or dietary advice.'

export interface Recipe {
  id: string
  user_id: string | null
  title: string
  servings: number
  prep_time: string | null
  cook_time: string | null
  total_time: string | null
  ingredients: IngredientSection[]
  instructions: string[]
  tags: string[]
  ingredient_tokens: string[]
  source_url: string | null
  notes: string | null
  nutrition: RecipeNutrition | null
  created_at: string
  updated_at: string
}

/** Per-user staples and dietary preferences (pre-auth: single row with user_id null). */
export interface UserSettings {
  id: string
  user_id: string | null
  staple_ingredients: string[]
  /** e.g. vegetarian, vegan, gluten_free */
  diets: string[]
  /** e.g. peanuts, shellfish, dairy */
  allergens_exclude: string[]
  cuisines_prefer: string[]
  cuisines_avoid: string[]
  equipment: string[]
  max_prep_minutes: number | null
  max_cook_minutes: number | null
  skill_level: SkillLevel | null
  default_servings: number
  created_at: string
  updated_at: string
}

export interface UserSettingsInput {
  staple_ingredients?: string[]
  diets?: string[]
  allergens_exclude?: string[]
  cuisines_prefer?: string[]
  cuisines_avoid?: string[]
  equipment?: string[]
  max_prep_minutes?: number | null
  max_cook_minutes?: number | null
  skill_level?: SkillLevel | null
  default_servings?: number
}

export interface IngredientSection {
  section: string
  items: IngredientItem[]
}

export interface IngredientItem {
  ingredient: string
  quantity: string
}

// Raw ingredients format from Gemini API
export interface RawIngredients {
  sections: IngredientSection[]
  optional?: IngredientItem[]
}

// Ingredients can be in multiple formats before normalization:
// 1. Normalized array format: IngredientSection[]
// 2. Raw API format: { sections: [], optional: [] }
// 3. String (JSON) that needs parsing
export type IngredientsInput = IngredientSection[] | RawIngredients | string

export interface RecipeInput {
  title: string
  servings: number
  prep_time: string
  cook_time: string
  total_time: string
  ingredients: IngredientSection[]
  instructions: string[]
  tags: string[]
  source_url?: string
  notes?: string
}

export type RecipeChunkSource = 'martinez' | 'wikibooks'

export interface RecipeChunk {
  id: string
  source: RecipeChunkSource
  source_id: string
  title: string
  chunk_index: number
  content: string
  ingredient_tokens: string[]
  embedding_model: string
  embedding_dim: number
  created_at: string
}

export interface RecipeChunkMatch {
  id: string
  source: RecipeChunkSource
  title: string
  content: string
  similarity: number
}

export interface GenerateRecipeRequest {
  query: string
  /** Ingredients to build the recipe around (retrieval + generation focus). */
  key_ingredients?: string[]
  /** @deprecated Use key_ingredients */
  pantry?: string[]
  /** Default true — load staples, diets, allergens, etc. from user_settings */
  include_user_settings?: boolean
  personal_match_count?: number
  corpus_match_count?: number
  /** Refinement: user change request (requires previous_recipe) */
  feedback?: string
  /** Refinement: last generated recipe to revise (requires feedback) */
  previous_recipe?: RecipeInput
}

export interface PersonalRecipeMatch {
  id: string
  title: string
  overlap_count: number
  ingredient_tokens: string[]
}

export interface GenerateRecipeMeta {
  key_ingredient_tokens: string[]
  staple_tokens?: string[]
  /** Main ingredients not matched to staples or key ingredients (post-generation check). */
  not_on_staples_pantry?: string[]
  embed_model: string
  embed_dim: number
  generation_model: string
  corpus_warning?: string
  sources_inspiration?: string[]
  refinement?: boolean
}

export interface GenerateRecipeResponse {
  recipe: RecipeInput
  personal_matches: PersonalRecipeMatch[]
  corpus_matches: RecipeChunkMatch[]
  meta: GenerateRecipeMeta
}
