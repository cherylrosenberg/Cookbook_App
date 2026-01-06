import { GoogleGenerativeAI } from '@google/generative-ai'
import { RecipeInput, RawIngredients, IngredientSection } from './supabase'

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

const GEMINI_PROMPT = `​​You are a recipe extraction assistant.
Given recipe content (from a blog post, social media caption, or notes), extract and return ONLY valid JSON using the following structure:
{
"title": "string",
"servings": "string",
"prep_time": "string (if not stated, estimate reasonably)",
"cook_time": "string (if not stated, estimate reasonably)",
"ingredients": {
"sections": [
{
"section": "string",
"items": [
{ "ingredient": "string", "quantity": "string" }
]
}
],
"optional": [
{ "ingredient": "string", "quantity": "string" }
]
},
"instructions": ["string"],
"tags": ["string"],
"source_url": "string (include if provided)"
}
Rules:
Title
Extract the recipe title.
If no title exists, infer a reasonable one from the content.
Servings
If the recipe explicitly states servings, yield, or number of portions, extract the number (e.g., "6 servings" -> 6, "serves 4" -> 4).
Return as a number (integer), not a string.
If servings are NOT explicitly stated, return 0 (zero).
Do NOT estimate servings.
Ingredient Sections
If the recipe lists ingredients in multiple sections (e.g., “Salad”, “Vinaigrette”, “Sauce”), preserve those sections exactly.
Each section must appear in the order shown in the recipe.
If the recipe has only one ingredient list, create a single section named "Main".
Optional Ingredients
Ingredients explicitly labeled as optional, suggested, or “to taste” should be placed in the top-level "optional" list.
Do NOT place optional ingredients inside ingredient sections.
Ingredients
Extract ingredients exactly as written, including quantities and units.
Do NOT add ingredients that are not present in the source.
If a quantity is unclear or missing, infer a reasonable amount and mark it as "(estimated)".
Instructions
Extract step-by-step instructions exactly as written.
Number each instruction sequentially.
For each ingredient:
Include the full ingredient quantity the FIRST time the ingredient appears in the instructions.
Do NOT repeat the full quantity in subsequent steps.


Partial quantity rule (very important):
If an instruction explicitly specifies a partial quantity (e.g., "½ cup", "1 teaspoon"):
Use ONLY the partial quantity exactly as written.
Do NOT include the full ingredient quantity anywhere in that instruction.
Do NOT add the full quantity in parentheses or in any other form.




Never show both a partial quantity and a full quantity for the same ingredient in the same instruction.
Do NOT remove, paraphrase, or add steps.
Prep Time and Cook Time
If explicitly stated, copy exactly.
If not stated, estimate reasonably based on the recipe content.
Tags
Suggest 1–5 relevant tags based on cuisine, meal type, or cooking method.
Source URL
Include the source URL if provided in the input.
Output rules:
Return valid JSON only.
Do NOT add extra keys.
Do NOT include commentary or explanations.
Ensure proper JSON syntax.
Do NOT hallucinate ingredients, steps, sections, servings, or metadata.
`

export async function extractRecipeFromText(text: string, sourceUrl?: string): Promise<RecipeInput> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  // Use gemini-3-flash-preview as requested
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

  let prompt = GEMINI_PROMPT + '\n\nRecipe content:\n' + text
  if (sourceUrl) {
    prompt += `\n\nSource URL: ${sourceUrl}`
  }

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Extract JSON from response (handle markdown code blocks if present)
    let jsonText = text.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const recipe = JSON.parse(jsonText) as any

    // Normalize ingredients from RawIngredients format to IngredientSection[]
    if (recipe.ingredients && typeof recipe.ingredients === 'object' && !Array.isArray(recipe.ingredients)) {
      const rawIngredients = recipe.ingredients as RawIngredients
      const normalized: IngredientSection[] = []
      
      if (Array.isArray(rawIngredients.sections)) {
        normalized.push(...rawIngredients.sections)
      }
      
      if (Array.isArray(rawIngredients.optional) && rawIngredients.optional.length > 0) {
        normalized.push({
          section: 'Optional ingredients',
          items: rawIngredients.optional
        })
      }
      
      recipe.ingredients = normalized.length > 0 ? normalized : []
    }

    // Validate required fields
    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new Error('Invalid recipe structure: missing required fields')
    }

    // Ensure ingredients is an array
    if (!Array.isArray(recipe.ingredients)) {
      recipe.ingredients = []
    }

    // Parse servings - handle both string and number formats
    if (typeof recipe.servings === 'string') {
      // Extract number from string (e.g., "6 servings" -> 6, "4" -> 4)
      const servingsMatch = recipe.servings.match(/\d+/)
      if (servingsMatch) {
        recipe.servings = parseInt(servingsMatch[0], 10)
      } else {
        // Empty string or no number found - set to null/undefined to indicate missing
        recipe.servings = undefined as any
      }
    }
    // Only default to 4 if servings is truly missing (undefined, null, or 0)
    if (!recipe.servings || recipe.servings === 0 || typeof recipe.servings !== 'number') {
      recipe.servings = 4
    }

    // Ensure tags is an array
    if (!Array.isArray(recipe.tags)) {
      recipe.tags = []
    }

    return recipe as RecipeInput
  } catch (error) {
    console.error('Error extracting recipe:', error)
    throw new Error(`Failed to extract recipe: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function extractRecipeFromUrl(url: string): Promise<RecipeInput> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  
  // Use URL context/grounding - pass URL via fileData.fileUri
  // The model will automatically fetch and process the URL content
  // Note: URL context might not require tools configuration when using fileData
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-3-flash-preview',
    // URL context works with fileData - no special tools needed for basic URL access
    // googleSearchRetrieval is for Google Search, not URL context
  })

  // Construct the prompt - the URL context tool will fetch the content from the URL
  const prompt = `${GEMINI_PROMPT}\n\nExtract the recipe from this URL using URL context: ${url}\n\nSource URL: ${url}`

  try {
    // Note: fileData.fileUri is typically for Google Cloud Storage URIs (gs://)
    // For HTTP URLs, URL context may need to be enabled differently or may not be
    // supported via fileData in this SDK version
    // 
    // Attempt 1: Try fileData with HTTP URL (may not work)
    let result
    try {
      // Some SDK versions might support HTTP URLs via fileData
      result = await model.generateContent([
        { text: prompt },
        {
          fileData: {
            mimeType: 'text/html',
            fileUri: url, // Note: This may only work for gs:// URIs, not http:// URLs
          },
        } as any,
      ])
    } catch (fileDataError: any) {
      // fileData.fileUri doesn't support HTTP URLs - this is expected
      // The error message will be logged and we'll fall back
      console.warn('URL context via fileData.fileUri not supported for HTTP URLs:', fileDataError?.message || fileDataError)
      throw fileDataError // Re-throw to trigger fallback to manual fetch
    }

    const response = await result.response
    const text = response.text()

    // Extract JSON from response (handle markdown code blocks if present)
    let jsonText = text.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const recipe = JSON.parse(jsonText) as any

    // Normalize ingredients from RawIngredients format to IngredientSection[]
    if (recipe.ingredients && typeof recipe.ingredients === 'object' && !Array.isArray(recipe.ingredients)) {
      const rawIngredients = recipe.ingredients as RawIngredients
      const normalized: IngredientSection[] = []
      
      if (Array.isArray(rawIngredients.sections)) {
        normalized.push(...rawIngredients.sections)
      }
      
      if (Array.isArray(rawIngredients.optional) && rawIngredients.optional.length > 0) {
        normalized.push({
          section: 'Optional ingredients',
          items: rawIngredients.optional
        })
      }
      
      recipe.ingredients = normalized.length > 0 ? normalized : []
    }

    // Validate required fields
    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new Error('Invalid recipe structure: missing required fields')
    }

    // Ensure ingredients is an array
    if (!Array.isArray(recipe.ingredients)) {
      recipe.ingredients = []
    }

    // Parse servings - handle both string and number formats
    if (typeof recipe.servings === 'string') {
      // Extract number from string (e.g., "6 servings" -> 6, "4" -> 4)
      const servingsMatch = recipe.servings.match(/\d+/)
      if (servingsMatch) {
        recipe.servings = parseInt(servingsMatch[0], 10)
      } else {
        // Empty string or no number found - set to null/undefined to indicate missing
        recipe.servings = undefined as any
      }
    }
    // Only default to 4 if servings is truly missing (undefined, null, or 0)
    if (!recipe.servings || recipe.servings === 0 || typeof recipe.servings !== 'number') {
      recipe.servings = 4
    }

    // Ensure tags is an array
    if (!Array.isArray(recipe.tags)) {
      recipe.tags = []
    }

    // Ensure source_url is set
    recipe.source_url = url

    return recipe as RecipeInput
  } catch (error) {
    console.error('Error extracting recipe from URL with fileData:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
    })
    
    // If URL grounding fails, fall back to fetching the content ourselves
    console.log('Falling back to manual URL fetching...')
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`)
      }

      const html = await response.text()

      // Extract text content from HTML
      let text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      // Limit text length to avoid token limits
      if (text.length > 10000) {
        text = text.substring(0, 10000) + '...'
      }

      return extractRecipeFromText(text, url)
    } catch (fallbackError) {
      const originalErrorMsg = error instanceof Error ? error.message : String(error)
      const fallbackErrorMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      throw new Error(`Failed to extract recipe from URL. URL context failed: ${originalErrorMsg}. Fallback also failed: ${fallbackErrorMsg}`)
    }
  }
}

