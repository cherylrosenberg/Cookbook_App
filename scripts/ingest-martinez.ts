/**
 * Ingest Martinez CSV into recipe_chunks with Gemini embeddings.
 *
 * npm run ingest:martinez -- --dry-run --limit 50
 * npm run ingest:martinez -- --limit 2000
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import {
  EMBEDDING_DIM,
  EMBEDDING_MODEL,
  embedDocuments,
  vectorToPostgres,
} from '../lib/embeddings'
import { loadEnvLocal } from '../lib/load-env-local'
import { loadMartinezRows, estimateTokens } from '../lib/martinez-csv'
import { martinezRowToChunk } from '../lib/recipe-chunk'

const DEFAULT_CSV = 'data/martinez-13k-recipes.csv'
const CHECKPOINT_PATH = 'data/.ingest-martinez-checkpoint.json'

interface CliOptions {
  limit: number
  offset: number
  dryRun: boolean
  clear: boolean
  batchSize: number
  delayMs: number
  resume: boolean
  csvPath: string
}

interface Checkpoint {
  lastRowIndex: number
  embedding_model: string
  embedding_dim: number
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    limit: 2000,
    offset: 0,
    dryRun: false,
    clear: false,
    batchSize: 30,
    delayMs: 3000,
    resume: false,
    csvPath: DEFAULT_CSV,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--clear') opts.clear = true
    else if (arg === '--resume') opts.resume = true
    else if (arg === '--limit') opts.limit = parseInt(argv[++i], 10)
    else if (arg === '--offset') opts.offset = parseInt(argv[++i], 10)
    else if (arg === '--batch-size') opts.batchSize = parseInt(argv[++i], 10)
    else if (arg === '--delay-ms') opts.delayMs = parseInt(argv[++i], 10)
    else if (arg === '--csv') opts.csvPath = argv[++i]
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: npm run ingest:martinez -- [options]
  --limit N         Max rows (default 2000)
  --offset N        Skip first N data rows
  --batch-size N    Texts per embed call (default 30)
  --delay-ms N      Pause between batches (default 3000)
  --dry-run         Parse only, no API/DB
  --clear           Delete existing martinez chunks first
  --resume          Continue from checkpoint file
  --csv PATH        CSV path (default ${DEFAULT_CSV})`)
      process.exit(0)
    }
  }

  return opts
}

function loadCheckpoint(): Checkpoint | null {
  const path = join(process.cwd(), CHECKPOINT_PATH)
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8')) as Checkpoint
}

function saveCheckpoint(lastRowIndex: number) {
  const dir = join(process.cwd(), 'data')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const data: Checkpoint = {
    lastRowIndex,
    embedding_model: EMBEDDING_MODEL,
    embedding_dim: EMBEDDING_DIM,
  }
  writeFileSync(join(process.cwd(), CHECKPOINT_PATH), JSON.stringify(data, null, 2))
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  loadEnvLocal()
  const opts = parseArgs(process.argv.slice(2))
  const csvPath = join(process.cwd(), opts.csvPath)

  if (!existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`)
    console.error('Download 13k-recipes.csv — see data/README.md')
    process.exit(1)
  }

  let startOffset = opts.offset
  if (opts.resume && !opts.clear) {
    const cp = loadCheckpoint()
    if (cp) {
      if (
        cp.embedding_model !== EMBEDDING_MODEL ||
        cp.embedding_dim !== EMBEDDING_DIM
      ) {
        console.error(
          'Checkpoint model/dim mismatch. Use --clear or delete checkpoint.'
        )
        process.exit(1)
      }
      startOffset = cp.lastRowIndex + 1
      console.log(`Resuming after row index ${cp.lastRowIndex}`)
    }
  }

  const rows = loadMartinezRows(csvPath, {
    offset: startOffset,
    limit: opts.limit,
  })

  if (rows.length === 0) {
    console.log('No rows to process.')
    return
  }

  console.log(
    `Loaded ${rows.length} rows (offset ${startOffset}, limit ${opts.limit})`
  )

  if (opts.dryRun) {
    let totalTokens = 0
    for (const row of rows) {
      const chunk = martinezRowToChunk(row)
      const tokens = estimateTokens(chunk.content)
      totalTokens += tokens
      if (row.rowIndex - startOffset < 5) {
        console.log(`\n[${row.rowIndex}] ${chunk.title}`)
        console.log(`  content: ${chunk.content.length} chars, ~${tokens} tokens`)
        console.log(`  ingredient_tokens: ${chunk.ingredient_tokens.length}`)
      }
    }
    const batches = Math.ceil(rows.length / opts.batchSize)
    console.log(`\nDry-run summary:`)
    console.log(`  rows: ${rows.length}`)
    console.log(`  est. embed API requests: ${batches}`)
    console.log(`  est. total tokens: ~${totalTokens}`)
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      'Missing SUPABASE_URL and SUPABASE_SECRET_KEY (or anon/publishable key)'
    )
    process.exit(1)
  }

  if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      'Warning: SUPABASE_SECRET_KEY not set; using anon key (may fail on bulk insert).'
    )
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('Missing GEMINI_API_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  if (opts.clear) {
    const { error } = await supabase
      .from('recipe_chunks')
      .delete()
      .eq('source', 'martinez')
    if (error) {
      console.error('Clear failed:', error.message)
      process.exit(1)
    }
    console.log('Cleared existing martinez chunks.')
  }

  const batchSize = opts.batchSize
  const totalBatches = Math.ceil(rows.length / batchSize)
  let processed = 0

  for (let b = 0; b < totalBatches; b++) {
    const batchRows = rows.slice(b * batchSize, (b + 1) * batchSize)
    const chunks = batchRows.map((row) => martinezRowToChunk(row))
    const texts = chunks.map((c) => c.content)

    console.log(
      `Batch ${b + 1}/${totalBatches} — rows ${batchRows[0].rowIndex}–${batchRows[batchRows.length - 1].rowIndex} — embedding...`
    )

    const vectors = await embedDocuments(texts)

    const insertRows = chunks.map((chunk, i) => ({
      source: chunk.source,
      source_id: chunk.source_id,
      title: chunk.title,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      ingredient_tokens: chunk.ingredient_tokens,
      embedding: vectorToPostgres(vectors[i]),
      embedding_model: EMBEDDING_MODEL,
      embedding_dim: EMBEDDING_DIM,
    }))

    const { error } = await supabase.from('recipe_chunks').insert(insertRows)
    if (error) {
      console.error('Insert failed:', error.message)
      process.exit(1)
    }

    processed += batchRows.length
    const lastIndex = batchRows[batchRows.length - 1].rowIndex
    saveCheckpoint(lastIndex)
    console.log(`  OK — ${processed}/${rows.length} (checkpoint row ${lastIndex})`)

    if (b < totalBatches - 1 && opts.delayMs > 0) {
      await sleep(opts.delayMs)
    }
  }

  console.log(`Ingest complete: ${processed} chunks (${EMBEDDING_MODEL} @ ${EMBEDDING_DIM}).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
