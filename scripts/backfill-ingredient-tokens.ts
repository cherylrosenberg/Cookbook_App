/**
 * One-time backfill of recipes.ingredient_tokens for rows created before migration 003.
 *
 * From Cookbook_App directory (with .env.local present):
 *   npx tsx scripts/backfill-ingredient-tokens.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { recipeToIngredientTokens } from '../lib/ingredient-normalize'
import { normalizeIngredients } from '../lib/recipe-normalize'

function loadEnvLocal() {
  const path = join(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  const content = readFileSync(path, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

async function main() {
  loadEnvLocal()

  const url = process.env.SUPABASE_URL
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error(
      'Missing SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) in .env.local'
    )
    process.exit(1)
  }

  const supabase = createClient(url, key)
  const { data: recipes, error } = await supabase.from('recipes').select('id, ingredients')

  if (error) {
    console.error('Failed to fetch recipes:', error.message)
    process.exit(1)
  }

  if (!recipes?.length) {
    console.log('No recipes to backfill.')
    return
  }

  let updated = 0
  let failed = 0

  for (const recipe of recipes) {
    const ingredients = normalizeIngredients(recipe.ingredients)
    const ingredient_tokens = recipeToIngredientTokens(ingredients)

    const { error: updateError } = await supabase
      .from('recipes')
      .update({ ingredient_tokens })
      .eq('id', recipe.id)

    if (updateError) {
      console.error(`Failed ${recipe.id}:`, updateError.message)
      failed++
    } else {
      updated++
    }
  }

  console.log(`Backfill complete: ${updated} updated, ${failed} failed.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
