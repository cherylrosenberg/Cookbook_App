-- Precomputed canonical ingredient tokens for pantry matching (backfill via scripts/backfill-ingredient-tokens.ts)
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS ingredient_tokens TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_recipes_ingredient_tokens
  ON recipes USING GIN (ingredient_tokens);
