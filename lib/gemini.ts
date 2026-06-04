import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  PersonalRecipeMatch,
  RecipeChunkMatch,
  RecipeInput,
  UserSettings,
} from './supabase'
import { enrichRecipeInstructions } from './instruction-enrich'
import { normalizeIngredients } from './recipe-normalize'
import { fetchRecipePageContent } from './fetch-recipe-page'

const DEFAULT_GENERATION_MODEL = 'gemini-3-flash-preview'

export function getGenerationModelName(): string {
  return process.env.GEMINI_GENERATION_MODEL ?? DEFAULT_GENERATION_MODEL
}

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

const EXTRACT_GENERATION_CONFIG = {
  temperature: 0.1,
  topK: 40,
  topP: 0.95,
} as const

const GENERATE_RECIPE_CONFIG = {
  temperature: 0.5,
  topK: 40,
  topP: 0.95,
} as const

const RECIPE_JSON_SCHEMA = `{
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
}`

const MAX_CORPUS_SNIPPET_CHARS = 1800

function truncateSnippet(text: string, max = MAX_CORPUS_SNIPPET_CHARS): string {
  const t = text.trim()
  if (t.length <= max) return t
  return t.slice(0, max) + '\n...'
}

function formatUserSettingsBlock(settings: UserSettings | null): string {
  if (!settings) return '(No saved user preferences.)'
  const lines: string[] = []
  if (settings.diets?.length) lines.push(`Diets: ${settings.diets.join(', ')}`)
  if (settings.allergens_exclude?.length) {
    lines.push(`Exclude allergens: ${settings.allergens_exclude.join(', ')}`)
  }
  if (settings.cuisines_prefer?.length) {
    lines.push(`Prefer cuisines: ${settings.cuisines_prefer.join(', ')}`)
  }
  if (settings.cuisines_avoid?.length) {
    lines.push(`Avoid cuisines: ${settings.cuisines_avoid.join(', ')}`)
  }
  if (settings.equipment?.length) {
    lines.push(`Equipment: ${settings.equipment.join(', ')}`)
  }
  if (settings.max_prep_minutes != null) {
    lines.push(`Max prep minutes: ${settings.max_prep_minutes}`)
  }
  if (settings.max_cook_minutes != null) {
    lines.push(`Max cook minutes: ${settings.max_cook_minutes}`)
  }
  if (settings.skill_level) lines.push(`Skill level: ${settings.skill_level}`)
  lines.push(`Default servings: ${settings.default_servings}`)
  if (settings.staple_ingredients?.length) {
    lines.push(`Staples: ${settings.staple_ingredients.join(', ')}`)
  }
  return lines.length ? lines.join('\n') : '(No saved user preferences.)'
}

function formatPersonalMatches(matches: PersonalRecipeMatch[]): string {
  if (!matches.length) return '(No matching recipes in personal cookbook.)'
  return matches
    .map(
      (m) =>
        `- ${m.title} (overlap: ${m.overlap_count}; tokens: ${m.ingredient_tokens.slice(0, 12).join(', ')})`
    )
    .join('\n')
}

function formatCorpusMatches(matches: RecipeChunkMatch[]): string {
  if (!matches.length) return '(No corpus references.)'
  return matches
    .map(
      (m, i) =>
        `[${i + 1}] ${m.title} (${m.source}, similarity ${(m.similarity * 100).toFixed(0)}%)\n${truncateSnippet(m.content)}`
    )
    .join('\n\n')
}

export interface GenerateRecipeContextParams {
  query: string
  pantryTokens: string[]
  settings: UserSettings | null
  personalMatches: PersonalRecipeMatch[]
  corpusMatches: RecipeChunkMatch[]
  feedback?: string
  previousRecipe?: RecipeInput
}

function formatPreviousRecipeSummary(recipe: RecipeInput): string {
  const ingredientLines: string[] = []
  for (const section of recipe.ingredients ?? []) {
    for (const item of section.items ?? []) {
      ingredientLines.push(
        `- ${item.quantity ? `${item.quantity} ` : ''}${item.ingredient}`
      )
    }
  }
  const instructions = recipe.instructions ?? []
  return [
    `Title: ${recipe.title}`,
    `Servings: ${recipe.servings}`,
    `Prep: ${recipe.prep_time || '(none)'}`,
    `Cook: ${recipe.cook_time || '(none)'}`,
    `Tags: ${(recipe.tags ?? []).join(', ') || '(none)'}`,
    `Ingredients (${ingredientLines.length} items):`,
    ...ingredientLines.slice(0, 40),
    ...(ingredientLines.length > 40 ? ['...'] : []),
    `Instructions (${instructions.length} steps):`,
    ...instructions.slice(0, 15).map((s, i) => `${i + 1}. ${s}`),
    ...(instructions.length > 15 ? ['...'] : []),
    recipe.notes ? `Notes: ${recipe.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function generateRecipeFromContext(
  params: GenerateRecipeContextParams
): Promise<RecipeInput> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const inspirationTitles = [
    ...params.personalMatches.map((m) => m.title),
    ...params.corpusMatches.map((m) => m.title),
  ]

  const isRefinement =
    Boolean(params.feedback?.trim()) && Boolean(params.previousRecipe)

  const taskIntro = isRefinement
    ? `You are revising a recipe draft based on user feedback. Return ONE updated original recipe as valid JSON.`
    : `You are a creative recipe developer. Create ONE NEW original recipe and return ONLY valid JSON:`

  const refinementBlock = isRefinement
    ? `
REFINEMENT (apply this feedback to the previous recipe):
${params.feedback!.trim()}

Previous recipe draft (revise this—do not start from scratch unless feedback requires it):
${formatPreviousRecipeSummary(params.previousRecipe!)}

Refinement rules:
- Apply the user's feedback precisely (substitutions, omissions, time changes, etc.).
- Keep honoring diets, allergens, cuisines, time limits, and pantry when possible.
- Still write original wording; do not copy corpus text verbatim.
`
    : ''

  const prompt = `${taskIntro}

${RECIPE_JSON_SCHEMA}

CRITICAL RULES:
- Write an ORIGINAL recipe. Do NOT copy ingredient lists or instruction steps verbatim from the reference material below.
- Use references for ideas, techniques, and flavor direction only—not as text to paste.
- Honor user constraints (diets, allergens, cuisines, time limits, equipment).
- Prefer ingredients from the pantry list when possible.
- Instructions: include each ingredient's full quantity from the ingredients list on its FIRST mention in the steps; do not repeat full quantities on later mentions. If a step uses only a partial amount (e.g. "½ cup"), write only that partial amount in that step.
- Servings: use user default if not specified in the request.
- Tags: 2-4 broad tags, Sentence case (same style as a home cookbook app).
- source_url: omit or empty string for generated recipes.
- notes: include a short line listing inspiration titles (if any), e.g. "Inspired by: Title A, Title B (corpus: Martinez dataset, CC BY-SA 3.0)."
${refinementBlock}
User request:
${params.query.trim()}

Pantry tokens (canonical): ${params.pantryTokens.join(', ') || '(none)'}

User preferences:
${formatUserSettingsBlock(params.settings)}

Personal cookbook matches (titles/tokens only—inspiration, do not copy):
${formatPersonalMatches(params.personalMatches)}

Corpus references (truncated—inspiration only, do not copy verbatim):
${formatCorpusMatches(params.corpusMatches)}

Output: Valid JSON only. No markdown fences or commentary.`

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: getGenerationModelName() })

  try {
    const result = await model.generateContent(prompt, {
      generationConfig: GENERATE_RECIPE_CONFIG,
    } as Parameters<typeof model.generateContent>[1])
    const response = await result.response
    const recipe = parseGeminiRecipeJson(response.text())

    if (!recipe.notes && inspirationTitles.length > 0) {
      const unique = [...new Set(inspirationTitles)]
      recipe.notes = `Inspired by: ${unique.join(', ')} (corpus: Martinez dataset, CC BY-SA 3.0).`
    }

    if (
      params.settings?.default_servings &&
      (!recipe.servings || recipe.servings < 1)
    ) {
      recipe.servings = params.settings.default_servings
    }

    return recipe
  } catch (error) {
    console.error('Error generating recipe:', error)
    throw new Error(
      `Failed to generate recipe: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

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

  const parsed = recipe as unknown as RecipeInput
  return enrichRecipeInstructions(parsed)
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
      generationConfig: EXTRACT_GENERATION_CONFIG,
    } as Parameters<typeof model.generateContent>[1])
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
