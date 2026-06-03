-- Similarity search over recipe_chunks (cosine distance via pgvector)
CREATE OR REPLACE FUNCTION match_recipe_chunks(
  query_embedding vector(768),
  match_count int DEFAULT 8,
  filter_tokens text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source text,
  title text,
  content text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    rc.id,
    rc.source,
    rc.title,
    rc.content,
    (1 - (rc.embedding <=> query_embedding))::float AS similarity
  FROM recipe_chunks rc
  WHERE
    filter_tokens IS NULL
    OR cardinality(filter_tokens) = 0
    OR rc.ingredient_tokens && filter_tokens
  ORDER BY rc.embedding <=> query_embedding
  LIMIT GREATEST(match_count, 1);
$$;
