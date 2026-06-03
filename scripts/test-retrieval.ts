/**
 * Smoke test for match_recipe_chunks RPC.
 *
 * npm run test:retrieval
 * npm run test:retrieval -- --query "vegetarian chickpea spinach dinner"
 * npm run test:retrieval -- --tokens chickpea,spinach,lemon
 */
import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal } from '../lib/load-env-local'
import {
  buildPantryTokens,
  buildRetrievalQueryText,
  matchCorpusChunks,
} from '../lib/recipe-retrieval'

const DEFAULT_QUERY =
  'vegetarian dinner with chickpeas spinach and lemon'

function parseArgs(argv: string[]) {
  let query = DEFAULT_QUERY
  let tokens: string[] | null = null
  let matchCount = 5

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--query') query = argv[++i]
    else if (arg === '--tokens') {
      tokens = argv[++i].split(',').map((t) => t.trim()).filter(Boolean)
    } else if (arg === '--match-count') matchCount = parseInt(argv[++i], 10)
  }

  return { query, tokens, matchCount }
}

async function main() {
  loadEnvLocal()
  const { query, tokens: rawTokens, matchCount } = parseArgs(process.argv.slice(2))

  const url = process.env.SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Missing Supabase credentials in .env.local')
    process.exit(1)
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error('Missing GEMINI_API_KEY')
    process.exit(1)
  }

  const pantryTokens =
    rawTokens && rawTokens.length > 0
      ? buildPantryTokens(rawTokens, null)
      : []

  console.log('Query:', query)
  if (pantryTokens.length) {
    console.log('Filter tokens:', pantryTokens.join(', '))
  }

  const supabase = createClient(url, key)
  const retrievalQuery = buildRetrievalQueryText(query, pantryTokens)

  const data = await matchCorpusChunks(supabase, retrievalQuery, {
    limit: matchCount,
    pantryTokens: pantryTokens.length ? pantryTokens : undefined,
  })

  if (!data.length) {
    if (pantryTokens.length) {
      console.log(
        'No matches after pantry token filter (vector search ran; no chunks with overlapping ingredient_tokens).'
      )
    } else {
      console.log('No matches. Run ingest:martinez first.')
    }
    return
  }

  console.log('\nTop matches:')
  for (const row of data) {
    console.log(
      `  ${(row.similarity * 100).toFixed(1)}%  [${row.source}] ${row.title}`
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
