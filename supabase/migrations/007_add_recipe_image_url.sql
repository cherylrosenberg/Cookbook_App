ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN recipes.image_url IS
  'Public Supabase Storage URL for recipe cover image (WebP). No binary in DB.';
