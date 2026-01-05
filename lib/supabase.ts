import { createClient } from '@supabase/supabase-js'

// For API routes (server-side), use regular env vars
// For client-side, use NEXT_PUBLIC_ prefix
// Support both anon key (legacy) and publishable key (new format)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) in .env.local')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Types
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

