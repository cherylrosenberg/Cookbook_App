import { NextRequest, NextResponse } from 'next/server'
import { UserSettingsInput } from '@/lib/supabase'
import { requireSupabaseEnv } from '@/lib/supabase-env'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  buildUserSettingsUpdate,
  getOrCreatePreAuthSettings,
  validateUserSettingsInput,
} from '@/lib/user-settings'

export async function GET() {
  try {
    const env = requireSupabaseEnv()
    if (!env.ok) return env.response

    const supabase = createServerSupabaseClient()
    const settings = await getOrCreatePreAuthSettings(supabase)
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch user settings',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const env = requireSupabaseEnv()
    if (!env.ok) return env.response

    const body = (await request.json()) as UserSettingsInput
    const validationError = validateUserSettingsInput(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const update = buildUserSettingsUpdate(body)
    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()
    const existing = await getOrCreatePreAuthSettings(supabase)

    const { data, error } = await supabase
      .from('user_settings')
      .update(update)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to update user settings',
      },
      { status: 500 }
    )
  }
}
