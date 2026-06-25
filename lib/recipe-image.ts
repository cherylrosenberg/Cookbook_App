import { GoogleGenAI } from '@google/genai'
import sharp from 'sharp'
import { buildRecipeImagePrompt } from './recipe-image-prompt'
import { normalizeRecipeIngredients } from './recipe-normalize'
import { uploadRecipeImage } from './recipe-storage'
import { createServerSupabaseClient } from './supabase-server'
import { Recipe } from './supabase'

export const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-image'

export function getImageModelName(): string {
  return process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_IMAGE_MODEL
}

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
  return apiKey
}

function extractImageBytes(response: {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        thought?: boolean
        inlineData?: { mimeType?: string; data?: string }
      }>
    }
  }>
}): Buffer | null {
  const parts = response.candidates?.[0]?.content?.parts ?? []
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]
    if (part.thought === true) continue
    const mime = part.inlineData?.mimeType
    const data = part.inlineData?.data
    if (mime?.startsWith('image/') && data) {
      return Buffer.from(data, 'base64')
    }
  }
  return null
}

async function generateImageBuffer(recipe: Recipe): Promise<Buffer> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() })
  const prompt = buildRecipeImagePrompt(recipe)

  const response = await ai.models.generateContent({
    model: getImageModelName(),
    contents: prompt,
    config: {
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: '4:3',
        imageSize: '1K',
      },
    },
  })

  const raw = extractImageBytes(response)
  if (!raw) {
    throw new Error('Gemini returned no image data')
  }

  return sharp(raw)
    .resize({ width: 1024, height: 768, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()
}

export async function generateAndPersistRecipeImage(
  recipeId: string,
  options?: { throwOnError?: boolean }
): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY) {
    const msg = 'GEMINI_API_KEY is not set'
    if (options?.throwOnError) throw new Error(msg)
    console.warn(msg + '; skipping recipe image generation')
    return null
  }

  try {
    const supabase = createServerSupabaseClient()
    const { data: row, error: fetchError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .single()

    if (fetchError || !row) {
      const msg = `Recipe ${recipeId} not found`
      if (options?.throwOnError) throw new Error(msg)
      console.error(msg)
      return null
    }

    const recipe = normalizeRecipeIngredients(row) as Recipe
    const webpBuffer = await generateImageBuffer(recipe)
    const imageUrl = await uploadRecipeImage(recipeId, webpBuffer)

    const { error: updateError } = await supabase
      .from('recipes')
      .update({ image_url: imageUrl })
      .eq('id', recipeId)

    if (updateError) throw updateError

    return imageUrl
  } catch (err) {
    if (options?.throwOnError) throw err
    console.error(`Recipe image generation failed for ${recipeId}:`, err)
    return null
  }
}
