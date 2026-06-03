-- User preferences and pantry staples (single row with user_id NULL until auth)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  staple_ingredients TEXT[] NOT NULL DEFAULT '{}',
  diets TEXT[] NOT NULL DEFAULT '{}',
  allergens_exclude TEXT[] NOT NULL DEFAULT '{}',
  cuisines_prefer TEXT[] NOT NULL DEFAULT '{}',
  cuisines_avoid TEXT[] NOT NULL DEFAULT '{}',
  equipment TEXT[] NOT NULL DEFAULT '{}',
  max_prep_minutes INTEGER,
  max_cook_minutes INTEGER,
  skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  default_servings INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Only one pre-auth row (user_id IS NULL); PostgreSQL UNIQUE allows multiple NULLs otherwise
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_preauth_singleton
  ON user_settings ((1))
  WHERE user_id IS NULL;

-- Default settings for pre-auth single-user mode
INSERT INTO user_settings (user_id, staple_ingredients, default_servings)
SELECT NULL, '{}', 4
WHERE NOT EXISTS (SELECT 1 FROM user_settings WHERE user_id IS NULL);
