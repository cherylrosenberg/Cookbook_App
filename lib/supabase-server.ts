import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client for API routes.
// Support both anon key (legacy) and publishable key (new format).
// Use placeholders when env is missing so build (static analysis) does not throw.
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'placeholder-key'
  return createClient(supabaseUrl, supabaseAnonKey)
}
