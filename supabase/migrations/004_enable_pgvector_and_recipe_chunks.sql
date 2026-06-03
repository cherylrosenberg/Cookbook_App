-- Corpus A: vector-indexed recipe chunks for RAG (Martinez / Wikibooks)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS recipe_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('martinez', 'wikibooks')),
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  ingredient_tokens TEXT[] NOT NULL DEFAULT '{}',
  embedding vector(768) NOT NULL,
  embedding_model TEXT NOT NULL DEFAULT 'gemini-embedding-001',
  embedding_dim INTEGER NOT NULL DEFAULT 768,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, source_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_recipe_chunks_source ON recipe_chunks (source);

CREATE INDEX IF NOT EXISTS idx_recipe_chunks_ingredient_tokens
  ON recipe_chunks USING GIN (ingredient_tokens);

CREATE INDEX IF NOT EXISTS idx_recipe_chunks_embedding
  ON recipe_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
