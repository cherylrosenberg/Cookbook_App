import { createAdminSupabaseClient } from './supabase-admin'

export const DEFAULT_RECIPE_IMAGES_BUCKET = 'recipe-images'

export function getRecipeImagesBucket(): string {
  return process.env.RECIPE_IMAGES_BUCKET ?? DEFAULT_RECIPE_IMAGES_BUCKET
}

export function recipeImageObjectPath(recipeId: string): string {
  return `recipes/${recipeId}.webp`
}

/** Public URL for a recipe cover image in Storage. */
export function publicRecipeImageUrl(recipeId: string): string {
  const supabaseUrl = process.env.SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is not set')
  }
  const bucket = getRecipeImagesBucket()
  const path = recipeImageObjectPath(recipeId)
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}

export async function uploadRecipeImage(
  recipeId: string,
  webpBuffer: Buffer
): Promise<string> {
  const supabase = createAdminSupabaseClient()
  const bucket = getRecipeImagesBucket()
  const path = recipeImageObjectPath(recipeId)

  const { error } = await supabase.storage.from(bucket).upload(path, webpBuffer, {
    contentType: 'image/webp',
    upsert: true,
  })

  if (error) throw error

  return publicRecipeImageUrl(recipeId)
}

export async function deleteRecipeImage(recipeId: string): Promise<void> {
  const supabase = createAdminSupabaseClient()
  const bucket = getRecipeImagesBucket()
  const path = recipeImageObjectPath(recipeId)

  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) {
    console.warn(`Failed to delete recipe image ${path}:`, error.message)
  }
}
