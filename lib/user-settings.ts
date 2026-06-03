import { SupabaseClient } from '@supabase/supabase-js'
import { SkillLevel, UserSettings, UserSettingsInput } from './supabase'

const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced']

export const DEFAULT_USER_SETTINGS_ROW = {
  user_id: null as string | null,
  staple_ingredients: [] as string[],
  diets: [] as string[],
  allergens_exclude: [] as string[],
  cuisines_prefer: [] as string[],
  cuisines_avoid: [] as string[],
  equipment: [] as string[],
  max_prep_minutes: null as number | null,
  max_cook_minutes: null as number | null,
  skill_level: null as SkillLevel | null,
  default_servings: 4,
}

export function validateUserSettingsInput(
  input: UserSettingsInput
): string | null {
  if (
    input.skill_level !== undefined &&
    input.skill_level !== null &&
    !SKILL_LEVELS.includes(input.skill_level)
  ) {
    return `skill_level must be one of: ${SKILL_LEVELS.join(', ')}`
  }
  if (
    input.default_servings !== undefined &&
    (typeof input.default_servings !== 'number' ||
      input.default_servings < 1 ||
      !Number.isInteger(input.default_servings))
  ) {
    return 'default_servings must be a positive integer'
  }
  if (
    input.max_prep_minutes !== undefined &&
    input.max_prep_minutes !== null &&
    (typeof input.max_prep_minutes !== 'number' || input.max_prep_minutes < 0)
  ) {
    return 'max_prep_minutes must be a non-negative number or null'
  }
  if (
    input.max_cook_minutes !== undefined &&
    input.max_cook_minutes !== null &&
    (typeof input.max_cook_minutes !== 'number' || input.max_cook_minutes < 0)
  ) {
    return 'max_cook_minutes must be a non-negative number or null'
  }
  return null
}

export function buildUserSettingsUpdate(
  input: UserSettingsInput
): Record<string, unknown> {
  const update: Record<string, unknown> = {}
  const arrayFields = [
    'staple_ingredients',
    'diets',
    'allergens_exclude',
    'cuisines_prefer',
    'cuisines_avoid',
    'equipment',
  ] as const

  for (const key of arrayFields) {
    if (input[key] !== undefined) {
      update[key] = input[key]
    }
  }

  if (input.max_prep_minutes !== undefined) {
    update.max_prep_minutes = input.max_prep_minutes
  }
  if (input.max_cook_minutes !== undefined) {
    update.max_cook_minutes = input.max_cook_minutes
  }
  if (input.skill_level !== undefined) {
    update.skill_level = input.skill_level
  }
  if (input.default_servings !== undefined) {
    update.default_servings = input.default_servings
  }

  return update
}

export interface GetSettingsOptions {
  /** Authenticated user id; omit for pre-auth singleton row. */
  userId?: string | null
}

/**
 * Load settings for the current request. Pre-auth: singleton user_id IS NULL.
 * When auth exists, pass userId from session (not client body).
 */
export async function getSettingsForRequest(
  supabase: SupabaseClient,
  options: GetSettingsOptions = {}
): Promise<UserSettings | null> {
  const { userId } = options
  if (userId) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data as UserSettings | null
  }
  return getOrCreatePreAuthSettings(supabase)
}

/** Pre-auth: single settings row where user_id IS NULL. */
export async function getOrCreatePreAuthSettings(
  supabase: SupabaseClient
): Promise<UserSettings> {
  const { data: existing, error: selectError } = await supabase
    .from('user_settings')
    .select('*')
    .is('user_id', null)
    .limit(1)
    .maybeSingle()

  if (selectError) throw selectError
  if (existing) return existing as UserSettings

  const { data: created, error: insertError } = await supabase
    .from('user_settings')
    .insert(DEFAULT_USER_SETTINGS_ROW)
    .select()
    .single()

  if (insertError) throw insertError
  return created as UserSettings
}
