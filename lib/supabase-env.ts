import { NextResponse } from 'next/server'

export function requireSupabaseEnv():
  | { ok: true }
  | { ok: false; response: NextResponse } {
  if (
    !process.env.SUPABASE_URL ||
    (!process.env.SUPABASE_PUBLISHABLE_KEY && !process.env.SUPABASE_ANON_KEY)
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            'Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) in .env.local',
        },
        { status: 500 }
      ),
    }
  }
  return { ok: true }
}
