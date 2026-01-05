# Digital Cookbook App

A personal digital cookbook application that ingests recipes from blog URLs or free text, extracts and structures them using AI, stores them in a database, and presents them in a clean, mobile-friendly UI.

## Setup

### Prerequisites

- Node.js 18+ and npm
- A Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
- A Supabase account ([Sign up here](https://supabase.com))

### Installation Steps

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
   - Create a `.env.local` file in the root directory
   - Add the following variables:
   ```
   GEMINI_API_KEY=your-google-ai-api-key-here
   SUPABASE_URL=your-supabase-project-url-here
   SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key-here
   ```
   - **Note:** You can use either `SUPABASE_PUBLISHABLE_KEY` (recommended, new format) or `SUPABASE_ANON_KEY` (legacy format). Both work the same way.
   - You can find your Supabase URL and publishable key in your Supabase project settings (Project Settings > API)

3. **Set up Supabase database:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase/migrations/001_create_recipes_table.sql`
   - Run the SQL query to create the recipes table

4. **Run the development server:**
```bash
npm run dev
```

5. **Open the app:**
   - Navigate to [http://localhost:3000](http://localhost:3000) in your browser

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini API
- **Icons**: Lucide React

## Features

- ✅ Add recipes from URL or text input
- ✅ AI-powered recipe extraction using Google Gemini
- ✅ Recipe library with responsive grid layout
- ✅ Search recipes by title or tags
- ✅ Filter recipes by tags (OR logic)
- ✅ Recipe detail view with all information
- ✅ Serving size adjuster with automatic quantity scaling
- ✅ Edit recipes (all fields)
- ✅ Delete recipes
- ✅ Mobile-responsive design (optimized for phone screens)
- ✅ Beautiful UI with forest green color scheme

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── extract-recipe/     # AI recipe extraction endpoint
│   │   └── recipes/             # CRUD endpoints for recipes
│   ├── recipe/[id]/            # Recipe detail page
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page (recipe library)
│   └── globals.css             # Global styles
├── components/
│   ├── RecipeCard.tsx          # Recipe card component
│   ├── RecipeInputModal.tsx    # Add recipe modal
│   ├── RecipeDetailView.tsx    # Recipe detail view
│   ├── EditRecipeForm.tsx      # Edit recipe form
│   └── SearchAndFilters.tsx    # Search and tag filters
├── lib/
│   ├── supabase.ts             # Supabase client and types
│   ├── gemini.ts               # Gemini API integration
│   └── quantity-parser.ts      # Quantity scaling logic
└── supabase/
    └── migrations/             # Database migrations
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables in Vercel project settings
4. Deploy!

The app is optimized for Vercel's free tier and will work out of the box.

## Notes

- The app uses server-side API routes, so environment variables don't need the `NEXT_PUBLIC_` prefix
- Recipe extraction may take a few seconds depending on the content length
- The serving size adjuster handles various quantity formats (fractions, decimals, units)
- All recipes are stored locally in your Supabase database

