export const EMBEDDING_MODEL = 'gemini-embedding-001'
export const EMBEDDING_DIM = 768
export const MAX_EMBED_CHARS = 6000

export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'

export function truncateForEmbedding(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= MAX_EMBED_CHARS) return trimmed
  return trimmed.slice(0, MAX_EMBED_CHARS)
}

export function l2Normalize(values: number[]): number[] {
  let sumSq = 0
  for (const v of values) sumSq += v * v
  const norm = Math.sqrt(sumSq)
  if (norm === 0) return values
  return values.map((v) => v / norm)
}

/** Cosine similarity for L2-normalized vectors (dot product). */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dim mismatch: ${a.length} vs ${b.length}`)
  }
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot
}

/** Parse pgvector column value from Supabase (string or array). */
export function parsePgVector(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((x) => Number(x))
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('[')) {
      return trimmed
        .slice(1, -1)
        .split(',')
        .map((s) => parseFloat(s.trim()))
    }
  }
  throw new Error('Invalid pgvector embedding value')
}

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
  return apiKey
}

function isRateLimitError(status: number, body: string): boolean {
  return status === 429 || /RESOURCE_EXHAUSTED|rate limit|quota/i.test(body)
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface BatchEmbedResponse {
  embeddings?: Array<{ values?: number[] }>
}

/**
 * Embed multiple texts in one API request (gemini-embedding-001 @ 768).
 * Uses REST batchEmbedContents for outputDimensionality + taskType support.
 */
export async function embedTexts(
  texts: string[],
  taskType: EmbeddingTaskType,
  options?: { maxRetries?: number }
): Promise<number[][]> {
  if (texts.length === 0) return []

  const apiKey = getApiKey()
  const maxRetries = options?.maxRetries ?? 5
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`

  const requests = texts.map((text) => ({
    model: `models/${EMBEDDING_MODEL}`,
    content: { parts: [{ text: truncateForEmbedding(text) }] },
    taskType,
    outputDimensionality: EMBEDDING_DIM,
  }))

  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    })

    const bodyText = await res.text()
    if (res.ok) {
      const data = JSON.parse(bodyText) as BatchEmbedResponse
      const embeddings = data.embeddings
      if (!embeddings || embeddings.length !== texts.length) {
        throw new Error(
          `Unexpected embed response: expected ${texts.length} embeddings, got ${embeddings?.length ?? 0}`
        )
      }
      return embeddings.map((item, i) => {
        const values = item.values
        if (!values || values.length !== EMBEDDING_DIM) {
          throw new Error(
            `Embedding ${i}: expected dim ${EMBEDDING_DIM}, got ${values?.length ?? 0}`
          )
        }
        return l2Normalize(values)
      })
    }

    lastError = new Error(`Embed API ${res.status}: ${bodyText.slice(0, 500)}`)
    if (isRateLimitError(res.status, bodyText) && attempt < maxRetries - 1) {
      const delayMs = [5000, 15000, 45000, 60000, 90000][attempt] ?? 90000
      await sleep(delayMs)
      continue
    }
    throw lastError
  }

  throw lastError ?? new Error('Embed failed after retries')
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  return embedTexts(texts, 'RETRIEVAL_DOCUMENT')
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text], 'RETRIEVAL_QUERY')
  return vec
}

/** Format vector for Supabase pgvector column insert. */
export function vectorToPostgres(values: number[]): string {
  return `[${values.join(',')}]`
}
