-- Public bucket for AI-generated recipe cover images (WebP files).
-- Uploads use SUPABASE_SECRET_KEY on the server only.

INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read recipe images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'recipe-images');
