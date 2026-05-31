import { GoogleGenerativeAI } from '@google/generative-ai'
import { RecipeInput } from './supabase'
import { normalizeIngredients } from './recipe-normalize'
import { fetchRecipePageContent } from './fetch-recipe-page'

// List available models for debugging
// Note: listModels might not be available in all SDK versions
export async function listAvailableModels(): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  try {
    // Use the API endpoint directly since listModels might not be in SDK
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`)
    const data = await response.json()
    return (data.models || []).map((model: any) => model.name.replace('models/', ''))
  } catch (error) {
    console.error('Error listing models:', error)
    return []
  }
}

const GEMINI_PROMPT = `You are a recipe extraction assistant. Extract recipe content and return ONLY valid JSON:

{
"title": "string",
"servings": "string",
"prep_time": "string (estimate if not stated)",
"cook_time": "string (estimate if not stated)",
"ingredients": {
  "sections": [{"section": "string", "items": [{"ingredient": "string", "quantity": "string"}]}],
  "optional": [{"ingredient": "string", "quantity": "string"}]
},
"instructions": ["string"],
"tags": ["string"],
"source_url": "string"
}

Rules:
- Title: Extract or infer from content
- Servings: Copy exactly if stated, otherwise infer from quantities
- Prep/Cook Time: Copy if stated, otherwise estimate reasonably
- Ingredient Sections: Preserve multiple sections exactly in order. Single list → "Main" section
- Optional Ingredients: Place ALL optional toppings, garnishes, and serve-with items in the top-level "optional" array, NOT in sections. If they appear only in instructions or under an optional/toppings heading (even when that heading has no listed items), still put them in "optional"
- Ingredients: Extract exactly as written. Mark unclear quantities as "(estimated)". Do NOT add missing ingredients
- Instructions: Extract exactly as written. Include full quantity on FIRST mention only. CRITICAL: If instruction specifies partial quantity (e.g., "½ cup"), use ONLY that partial quantity - never include full quantity in same step
- Tags: 2-4 broad tags, Sentence case. Categories: meal (Breakfast/Lunch/Dinner), cuisine (American/Asian/Mexican), ingredient category (Vegetarian/Vegan/Chicken/Beef/Pasta), meal type (Soup/Chili/Salad). Vegan dishes = "Vegan" only (not "Vegetarian"). Avoid specific tags like "aubergine" or "pan-seared"
- Source URL: Include if provided

Output: Valid JSON only. No extra keys, commentary, or explanations. Do NOT hallucinate any data.`

const GENERATION_CONFIG = {
  temperature: 0.1,
  topK: 40,
  topP: 0.95,
} as const

/** Strip markdown fences, normalize ingredients, validate, and coerce servings/tags. */
export function parseGeminiRecipeJson(jsonText: string, sourceUrl?: string): RecipeInput {
  let cleaned = jsonText.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const recipe = JSON.parse(cleaned) as Record<string, unknown>

  recipe.ingredients = normalizeIngredients(recipe.ingredients)

  if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
    throw new Error('Invalid recipe structure: missing required fields')
  }

  if (!Array.isArray(recipe.ingredients)) {
    recipe.ingredients = []
  }

  if (typeof recipe.servings === 'string') {
    const servingsMatch = recipe.servings.match(/\d+/)
    if (servingsMatch) {
      recipe.servings = parseInt(servingsMatch[0], 10)
    } else {
      recipe.servings = undefined
    }
  }

  if (!recipe.servings || recipe.servings === 0 || typeof recipe.servings !== 'number') {
    recipe.servings = 4
  }

  if (!Array.isArray(recipe.tags)) {
    recipe.tags = []
  }

  if (sourceUrl) {
    recipe.source_url = sourceUrl
  }

  return recipe as unknown as RecipeInput
}

export async function extractRecipeFromText(text: string, sourceUrl?: string): Promise<RecipeInput> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

  let prompt = GEMINI_PROMPT + '\n\nRecipe content:\n' + text
  if (sourceUrl) {
    prompt += `\n\nSource URL: ${sourceUrl}`
  }

  try {
    const result = await model.generateContent(prompt, {
      generationConfig: GENERATION_CONFIG,
    } as any)
    const response = await result.response
    const responseText = response.text()

    return parseGeminiRecipeJson(responseText, sourceUrl)
  } catch (error) {
    console.error('Error extracting recipe:', error)
    throw new Error(`Failed to extract recipe: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function extractRecipeFromUrl(url: string): Promise<RecipeInput> {
  const pageContent = await fetchRecipePageContent(url)
  const recipe = await extractRecipeFromText(pageContent, url)
  recipe.source_url = url
  return recipe
}
