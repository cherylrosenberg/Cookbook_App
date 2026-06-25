import { IngredientSection } from './supabase'

const MAX_INGREDIENT_CHARS = 2000
const MAX_INSTRUCTION_CHARS = 1500

function flattenIngredients(sections: IngredientSection[]): string {
  const lines: string[] = []
  for (const section of sections) {
    const name = section.section?.trim()
    if (name) lines.push(`${name}:`)
    for (const item of section.items ?? []) {
      const ingredient = item.ingredient?.trim()
      if (!ingredient) continue
      const qty = item.quantity?.trim()
      lines.push(qty ? `${qty} ${ingredient}` : ingredient)
    }
  }
  let text = lines.join('\n')
  if (text.length > MAX_INGREDIENT_CHARS) {
    text = text.slice(0, MAX_INGREDIENT_CHARS) + '…'
  }
  return text
}

function summarizeInstructions(instructions: string[]): string {
  const cleaned = instructions
    .map((s) => s.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(Boolean)
  let text = cleaned.slice(0, 6).join(' ')
  if (text.length > MAX_INSTRUCTION_CHARS) {
    text = text.slice(0, MAX_INSTRUCTION_CHARS) + '…'
  }
  return text
}

export function buildRecipeImagePrompt(recipe: {
  title: string
  ingredients: IngredientSection[]
  instructions: string[]
}): string {
  const ingredients = flattenIngredients(recipe.ingredients)
  const plating = summarizeInstructions(recipe.instructions)

  return `Professional food photography of "${recipe.title}".

Style: appetizing plated dish on a simple plate or bowl, natural soft lighting, shallow depth of field, no text, no watermarks, no logos, no people, no hands.

Key ingredients to show visibly in the dish:
${ingredients || '(use the dish title for identity)'}

Plating cues (do not render as text): ${plating || 'home-cooked presentation'}

Single finished dish, square composition suitable for a recipe card thumbnail.`
}
