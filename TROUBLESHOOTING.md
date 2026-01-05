# Troubleshooting: "Loading recipes..." Issue

## Issue
The app is stuck showing "Loading recipes..." and never loads.

## Quick Fixes

### 1. Restart the Development Server
Environment variables are only loaded when the server starts. If you just created or modified `.env.local`:

1. Stop the server (Ctrl+C in the terminal)
2. Start it again: `npm run dev`

### 2. Verify Your Supabase Anon Key Format
Your Supabase anon key should be a JWT token that starts with `eyJ`, not `sb_publishable_`.

**To get the correct key:**
1. Go to your Supabase project dashboard
2. Click **Settings** (gear icon) → **API**
3. Under **Project API keys**, find the **anon** or **public** key
4. It should look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90a2RsY25sc3Z0YnNmdG1reW8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNTc0NzYwMCwiZXhwIjoyMDUxMzIzNjAwfQ.xxxxx...` (very long string)
5. Copy this entire key (it's very long - make sure you get all of it)

### 3. Check Browser Console
1. Open your browser's Developer Tools (F12 or Cmd+Option+I)
2. Go to the **Console** tab
3. Look for any red error messages
4. Share the error message if you see one

### 4. Check Terminal Output
Look at the terminal where `npm run dev` is running for any error messages.

### 5. Test the API Directly
Open your browser and go to: `http://localhost:3000/api/recipes`

You should see either:
- `[]` (empty array) - This means the API is working!
- An error message - This will tell us what's wrong

### 6. Verify Environment Variables
Make sure your `.env.local` file has all three variables:

```env
GEMINI_API_KEY=your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...your-very-long-key-here
```

**Important:**
- No quotes around values
- No spaces around the `=` sign
- Each variable on its own line
- The file must be named exactly `.env.local` (with the leading dot)

## Common Issues

### Issue: Supabase Key Format Wrong
**Symptom:** API returns error or connection fails
**Solution:** Make sure you're using the **anon/public** key, not the service_role key or publishable key. It should start with `eyJ`.

### Issue: Environment Variables Not Loading
**Symptom:** Server shows warnings about missing env vars
**Solution:** Restart the dev server after creating/modifying `.env.local`

### Issue: CORS or Network Error
**Symptom:** Browser console shows CORS or network errors
**Solution:** This shouldn't happen with Next.js API routes, but check that you're accessing `localhost:3000` not a different port

## Still Stuck?

1. Check the browser console (F12) for errors
2. Check the terminal output for server errors
3. Verify your `.env.local` file format is correct
4. Make sure you restarted the dev server after creating `.env.local`

