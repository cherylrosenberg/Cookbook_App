# Environment Variables Setup Guide

This guide will walk you through setting up all the required environment variables for the Digital Cookbook App.

## Step 1: Get Your Google Gemini API Key

### 1.1 Go to Google AI Studio
1. Open your web browser and navigate to: **https://aistudio.google.com/**
2. Sign in with your Google account if you're not already signed in

### 1.2 Create or Access Your API Key
1. Once logged in, you'll see the Google AI Studio dashboard
2. Look for the **"Get API Key"** button or click on **"API Keys"** in the left sidebar
3. If you don't have an API key yet:
   - Click **"Create API Key"**
   - You may be prompted to create a new Google Cloud project or select an existing one
   - Choose **"Create API key in new project"** (recommended) or select an existing project
   - Click **"Create API key"**
4. Your API key will be displayed. **Copy it immediately** - you won't be able to see it again!
   - It will look something like: `AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567`

### 1.3 Important Notes
- Keep your API key secret! Don't share it publicly or commit it to version control
- The free tier has rate limits, but should be sufficient for personal use
- You can view and manage your API keys at: https://aistudio.google.com/app/apikey

---

## Step 2: Get Your Supabase Credentials

### 2.1 Create a Supabase Account (if you don't have one)
1. Go to **https://supabase.com**
2. Click **"Start your project"** or **"Sign in"**
3. Sign in with GitHub (recommended) or use email/password

### 2.2 Create a New Project
1. Once logged in, click **"New Project"** (or the **"+"** button)
2. Fill in the project details:
   - **Name**: e.g., "Cookbook App" or "My Recipes"
   - **Database Password**: Create a strong password (save this somewhere safe!)
   - **Region**: Choose the region closest to you
   - **Pricing Plan**: Select **"Free"** (sufficient for MVP)
3. Click **"Create new project"**
4. Wait 1-2 minutes for your project to be set up

### 2.3 Get Your Project URL and Anon Key
1. Once your project is ready, you'll be in the project dashboard
2. Click on the **⚙️ Settings icon** (gear icon) in the left sidebar
3. Click on **"API"** in the settings menu
4. You'll see two important values:

   **Project URL:**
   - Located under "Project URL"
   - Looks like: `https://abcdefghijklmnop.supabase.co`
   - Copy this value

   **Publishable key (recommended) or anon key:**
   - Located under "Project API keys"
   - Find the **"publishable"** key (new format, starts with `sb_publishable_`) OR the **"anon"** key (legacy format, starts with `eyJ`)
   - Both work the same way - the publishable key is the newer format
   - It's safe to expose this in client-side code
   - Click the **👁️ eye icon** to reveal it, then copy it

### 2.4 Set Up the Database Tables
1. In your Supabase dashboard, click on **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Run each migration file **in order** from `supabase/migrations/`:
   - `001_create_recipes_table.sql` — `recipes` table
   - `002_create_user_settings.sql` — `user_settings` table (staples, diets, etc.)
   - `003_add_recipes_ingredient_tokens.sql` — `ingredient_tokens` column on `recipes`
   - `004_enable_pgvector_and_recipe_chunks.sql` — `recipe_chunks` + pgvector (enable **vector** extension in Database → Extensions if SQL fails)
   - `005_match_recipe_chunks_rpc.sql` — similarity search function
4. For each file: copy the full contents, paste into SQL Editor, click **Run**
5. Verify in **Table Editor**: `recipes`, `user_settings`, and `recipe_chunks` exist

### 2.5 Backfill ingredient tokens (existing recipes only)
If you already had recipes before running migration `003`, run once from the `Cookbook_App` directory:

```bash
npx tsx scripts/backfill-ingredient-tokens.ts
```

New recipes created via the API compute `ingredient_tokens` automatically on save.

### 2.6 RAG corpus — Martinez ingest (PR2)

Embeddings use **`gemini-embedding-001`** at **768** dimensions (`RETRIEVAL_DOCUMENT` for corpus, `RETRIEVAL_QUERY` for search). Each row stores `embedding_model` and `embedding_dim` for audit.

**Add to `.env.local`** (in addition to existing vars):

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Find it in Supabase → Project Settings → API → **service_role** (secret; never expose in the browser or commit to git).

**Download corpus:**

1. Get `13k-recipes.csv` from [josephrmartinez/recipe-dataset](https://github.com/josephrmartinez/recipe-dataset)
2. Save as `Cookbook_App/data/martinez-13k-recipes.csv` (see `data/README.md`)

**Ingest (recommended order):**

```bash
cd Cookbook_App
npm run ingest:martinez -- --dry-run --limit 50
npm run ingest:martinez -- --limit 2000
npm run test:retrieval
```

**Rate limits (Gemini free tier):** The ingest script batches **30 recipes per API request** and waits **3 seconds** between batches. If you see `429 RESOURCE_EXHAUSTED`, lower `--batch-size` (e.g. 15) or increase `--delay-ms`. Check live limits in [AI Studio](https://aistudio.google.com/) before a full ~13k run. Enable billing Tier 1 if daily request quota is too low (typically low cost for a one-time embed).

**Full corpus later:**

```bash
npm run ingest:martinez -- --clear --limit 13000
```

**Flags:** `--resume` (continue from checkpoint), `--clear` (delete existing martinez chunks), `--dry-run`, `--batch-size`, `--delay-ms`

### 2.7 Test recipe generation (PR3)

Requires Martinez ingest (§2.6) and `GEMINI_API_KEY`. Optional: `PUT /api/user-settings` for staples and dietary prefs.

```bash
cd Cookbook_App
npm run dev
```

In another terminal:

```bash
curl -X POST http://localhost:3000/api/generate-recipe ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"vegetarian dinner with chickpeas and spinach\",\"pantry\":[\"chickpeas\",\"spinach\",\"lemon\"]}"
```

(PowerShell: use `Invoke-RestMethod` or curl with escaped quotes as above.)

**Optional env:** `GEMINI_GENERATION_MODEL` (default `gemini-3-flash-preview`) for the text model; embeddings always use `gemini-embedding-001` @ 768.

**Response:** `recipe` (JSON, not saved), `personal_matches`, `corpus_matches`, `meta` (tokens, models, optional `corpus_warning`, `refinement` when revising).

**Refine** (revise last draft — send both fields):

```bash
curl -X POST http://localhost:3000/api/generate-recipe ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"vegetarian dinner\",\"pantry\":[\"spinach\"],\"feedback\":\"I do not have chickpeas, use cannellini beans\",\"previous_recipe\":{\"title\":\"...\",\"servings\":4,\"prep_time\":\"10 min\",\"cook_time\":\"20 min\",\"total_time\":\"\",\"ingredients\":[],\"instructions\":[],\"tags\":[]}}"
```

### 2.8 Generator and settings UI (PR4)

With `npm run dev` running:

- **http://localhost:3000/generate** — query, pantry, generate, preview, refine with feedback, **Save to cookbook** (`POST /api/recipes`).
- **http://localhost:3000/settings** — staples, diets, allergens, cuisines, time limits, default servings.

Generated recipes are **not** saved until you click Save.

---

## Step 3: Create Your .env.local File

### 3.1 Create the File
1. In your project root directory (`/Users/Cheryl/Documents/Cookbook_App`), create a new file named `.env.local`
   - **Important**: The file must start with a dot (`.env.local`)
   - On Mac/Linux, you can create it in the terminal or use your code editor
   - If using VS Code or Cursor, you can create it directly in the editor

### 3.2 Add Your Environment Variables
Open `.env.local` and add the following, replacing the placeholder values with your actual credentials:

```env
# Google Gemini API Key
GEMINI_API_KEY=your-actual-gemini-api-key-here

# Supabase Configuration
SUPABASE_URL=your-actual-supabase-url-here
SUPABASE_PUBLISHABLE_KEY=your-actual-supabase-publishable-key-here
```

**Note:** You can use either `SUPABASE_PUBLISHABLE_KEY` (recommended, new format starting with `sb_publishable_`) or `SUPABASE_ANON_KEY` (legacy format starting with `eyJ`). Both work the same way.

**Example** (with fake values to show format):
```env
# Google Gemini API Key
GEMINI_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567

# Supabase Configuration
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.abcdefghijklmnopqrstuvwxyz1234567890
```

### 3.3 Important Notes
- **No quotes needed**: Don't wrap the values in quotes unless the value itself contains spaces
- **No spaces around the `=` sign**: Use `KEY=value` not `KEY = value`
- **One variable per line**: Each environment variable should be on its own line
- **Never commit this file**: The `.env.local` file is already in `.gitignore` to prevent accidental commits

### 3.4 Verify Your Setup
1. Make sure your `.env.local` file is in the project root (same directory as `package.json`)
2. Double-check that you've replaced all placeholder text with your actual values
3. Make sure there are no extra spaces or typos

---

## Step 4: Test Your Setup

### 4.1 Install Dependencies (if you haven't already)
```bash
npm install
```

### 4.2 Start the Development Server
```bash
npm run dev
```

### 4.3 Test the App
1. Open your browser to **http://localhost:3000**
2. Click **"+ Add Recipe"**
3. Try adding a recipe from text or URL
4. If you see any errors about missing API keys, double-check your `.env.local` file

### 4.4 Common Issues

**"Missing Supabase environment variables" warning:**
- Make sure your `.env.local` file is in the project root
- Restart your development server after creating/editing `.env.local`
- Check for typos in variable names (they must be exactly: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`)

**"Failed to extract recipe" error:**
- Verify your Gemini API key is correct
- Check that you haven't exceeded API rate limits
- Make sure the API key has the necessary permissions

**Database connection errors:**
- Verify your Supabase URL and anon key are correct
- Make sure you ran the SQL migration to create the `recipes` table
- Check that your Supabase project is active (not paused)

---

## Quick Reference

### File Location
- `.env.local` should be in: `/Users/Cheryl/Documents/Cookbook_App/.env.local`

### Required Variables
```
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=... (or SUPABASE_ANON_KEY for legacy format)
```

### Where to Get Them
- **Gemini API Key**: https://aistudio.google.com/app/apikey
- **Supabase Credentials**: Your Supabase project → Settings → API

### Next Steps After Setup
1. Run the database migration (SQL file in `supabase/migrations/`)
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`
4. Open http://localhost:3000

---

## Security Reminders

✅ **DO:**
- Keep your `.env.local` file local and never commit it
- Use the anon key (it's safe for client-side use)
- Rotate your API keys if you suspect they're compromised

❌ **DON'T:**
- Share your API keys publicly
- Commit `.env.local` to version control
- Use your service role key in client-side code (only use anon key)

