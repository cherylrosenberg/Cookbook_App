const FETCH_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const MAX_HTML_TEXT_LENGTH = 10000

const RECIPE_LD_FIELDS = [
  'name',
  'description',
  'recipeIngredient',
  'recipeInstructions',
  'recipeYield',
  'prepTime',
  'cookTime',
  'totalTime',
] as const

function isRecipeType(typeValue: unknown): boolean {
  if (!typeValue) return false
  const types = Array.isArray(typeValue) ? typeValue : [typeValue]
  return types.some((t) => {
    if (typeof t !== 'string') return false
    const lower = t.toLowerCase()
    return lower === 'recipe' || lower.endsWith('/recipe')
  })
}

function findRecipeNode(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== 'object') return null

  const obj = node as Record<string, unknown>

  if (isRecipeType(obj['@type'])) {
    return obj
  }

  if (Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph']) {
      const found = findRecipeNode(item)
      if (found) return found
    }
  }

  return null
}

/** Parse JSON-LD script blocks and return the first schema.org Recipe object, if any. */
export function extractJsonLdRecipe(html: string): Record<string, unknown> | null {
  const scriptRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = scriptRegex.exec(html)) !== null) {
    const raw = match[1]?.trim()
    if (!raw) continue

    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const found = findRecipeNode(item)
          if (found) return found
        }
      } else {
        const found = findRecipeNode(parsed)
        if (found) return found
      }
    } catch {
      continue
    }
  }

  return null
}

/** Build a bounded text blob from JSON-LD Recipe fields for the Gemini prompt. */
export function recipeLdToPromptText(recipe: Record<string, unknown>): string {
  const subset: Record<string, unknown> = {}
  for (const key of RECIPE_LD_FIELDS) {
    if (recipe[key] !== undefined && recipe[key] !== null) {
      subset[key] = recipe[key]
    }
  }
  return JSON.stringify(subset, null, 2)
}

function htmlToPlainText(html: string): string {
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length > MAX_HTML_TEXT_LENGTH) {
    text = text.substring(0, MAX_HTML_TEXT_LENGTH) + '...'
  }

  return text
}

/**
 * Fetch a recipe URL and return content for Gemini: JSON-LD Recipe when present,
 * otherwise stripped HTML text.
 */
export async function fetchRecipePageContent(url: string): Promise<string> {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error(`Invalid URL: ${url}`)
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(`Unsupported URL protocol: ${parsedUrl.protocol}`)
  }

  const response = await fetch(url, {
    headers: { 'User-Agent': FETCH_USER_AGENT },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
  }

  const html = await response.text()
  const jsonLdRecipe = extractJsonLdRecipe(html)

  if (jsonLdRecipe) {
    return `Structured recipe data (JSON-LD):\n${recipeLdToPromptText(jsonLdRecipe)}`
  }

  const text = htmlToPlainText(html)
  if (!text) {
    throw new Error('No readable content found on page')
  }

  return text
}
