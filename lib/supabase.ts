// Types for recipes (DB and API). Server client: lib/supabase-server.ts

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
  source_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
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
