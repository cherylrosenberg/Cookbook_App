import { createClient, SupabaseClient } from '@supabase/supabase-js'

let adminClient: SupabaseClient | null = null

/** Server-only secret key (sb_secret_...). Legacy SUPABASE_SERVICE_ROLE_KEY still accepted. */
export function getSupabaseSecretKey(): string | undefined {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

/** Server-only Supabase client with secret key (storage upload/delete, bypasses RLS). */
export function createAdminSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL
  const secretKey = getSupabaseSecretKey()

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SECRET_KEY are required for storage operations'
    )
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  return adminClient
}
