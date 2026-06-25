/**
 * Backfill recipe cover images for rows with image_url IS NULL.
 *
 * Requires .env.local with GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SECRET_KEY.
 *
 *   npm run backfill:recipe-images
 *   npm run backfill:recipe-images -- --limit 10
 *   npm run backfill:recipe-images -- --delay-ms 2000
 */
import { loadEnvLocal } from '../lib/load-env-local'
import { generateAndPersistRecipeImage } from '../lib/recipe-image'
import { createAdminSupabaseClient } from '../lib/supabase-admin'

function parseArgs(argv: string[]): { limit: number; delayMs: number } {
  let limit = 0
  let delayMs = 1500
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--limit' && argv[i + 1]) {
      limit = parseInt(argv[++i], 10) || 0
    } else if (argv[i] === '--delay-ms' && argv[i + 1]) {
      delayMs = parseInt(argv[++i], 10) || 1500
    }
  }
  return { limit, delayMs }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  loadEnvLocal()

  const url = process.env.SUPABASE_URL
  if (!url) {
    console.error('SUPABASE_URL is required')
    process.exit(1)
  }
  if (
    !process.env.SUPABASE_SECRET_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error('SUPABASE_SECRET_KEY is required')
    process.exit(1)
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is required')
    process.exit(1)
  }

  const { limit, delayMs } = parseArgs(process.argv.slice(2))
  const supabase = createAdminSupabaseClient()

  let query = supabase
    .from('recipes')
    .select('id, title')
    .is('image_url', null)
    .order('created_at', { ascending: true })

  if (limit > 0) {
    query = query.limit(limit)
  }

  const { data: rows, error } = await query
  if (error) {
    console.error('Failed to fetch recipes:', error.message)
    process.exit(1)
  }

  if (!rows?.length) {
    console.log('No recipes need images.')
    return
  }

  console.log(`Backfilling images for ${rows.length} recipe(s)…`)

  let ok = 0
  let fail = 0
  for (const row of rows) {
    console.log(`  ${row.id} — ${row.title}`)
    const imageUrl = await generateAndPersistRecipeImage(row.id)
    if (imageUrl) {
      ok++
      console.log(`    ✓ ${imageUrl}`)
    } else {
      fail++
      console.log('    ✗ failed (see logs)')
    }
    if (delayMs > 0) await sleep(delayMs)
  }

  console.log(`Done. ${ok} succeeded, ${fail} failed.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
