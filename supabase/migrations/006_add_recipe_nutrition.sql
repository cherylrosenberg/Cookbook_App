-- AI-estimated nutrition per recipe (cached JSONB)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS nutrition JSONB;
