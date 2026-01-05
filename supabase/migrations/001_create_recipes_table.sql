-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT NOT NULL,
  servings INTEGER NOT NULL DEFAULT 4,
  prep_time TEXT,
  cook_time TEXT,
  total_time TEXT,
  ingredients JSONB NOT NULL,
  instructions TEXT[] NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  source_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on tags for filtering performance
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN (tags);

-- Create index on title for search performance
CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes USING GIN (to_tsvector('english', title));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

