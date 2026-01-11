'use client'

import { useState, useEffect } from 'react'
import { Recipe, RawIngredients, IngredientSection } from '@/lib/supabase'
import RecipeCard from '@/components/RecipeCard'
import RecipeInputModal from '@/components/RecipeInputModal'
import SearchAndFilters from '@/components/SearchAndFilters'
import CarrotLoading from '@/components/CarrotLoading'

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRecipes()
  }, [])

  useEffect(() => {
    filterRecipes()
  }, [recipes, searchQuery, selectedTags])

  const fetchRecipes = async () => {
    try {
      setError(null)
      setLoading(true)
      console.log('[fetchRecipes] Starting fetch...')
      
      const response = await fetch('/api/recipes')
      console.log('[fetchRecipes] Response received:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[fetchRecipes] Error response:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const data = await response.json()
      console.log('[fetchRecipes] Data received:', data)
      
      // Normalize recipes - ensure ingredients is always an array
      // Handle different data structures from Gemini: { optional: [], sections: [] }
      const normalizedData = Array.isArray(data) ? data.map((recipe: Recipe) => {
        if (recipe.ingredients) {
          // Parse if string
          if (typeof recipe.ingredients === 'string') {
            try {
              recipe.ingredients = JSON.parse(recipe.ingredients)
            } catch (e) {
              console.error('Failed to parse ingredients for recipe:', recipe.id, e)
              recipe.ingredients = []
            }
          }
          
          // Handle the actual structure: { optional: [], sections: [] }
          // Type guard to check if it's RawIngredients format
          if (recipe.ingredients && typeof recipe.ingredients === 'object' && !Array.isArray(recipe.ingredients)) {
            const rawIngredients = recipe.ingredients as RawIngredients
            const normalized: IngredientSection[] = []
            
            if (Array.isArray(rawIngredients.sections)) {
              normalized.push(...rawIngredients.sections)
            }
            
            if (Array.isArray(rawIngredients.optional) && rawIngredients.optional.length > 0) {
              normalized.push({
                section: 'Optional ingredients',
                items: rawIngredients.optional
              })
            }
            
            recipe.ingredients = normalized.length > 0 ? normalized : []
          }
          
          if (!Array.isArray(recipe.ingredients)) {
            console.warn('Ingredients is not an array for recipe:', recipe.id, recipe.ingredients)
            recipe.ingredients = []
          }
        } else {
          recipe.ingredients = []
        }
        return recipe
      }) : []
      
      setRecipes(normalizedData)
      console.log('[fetchRecipes] Recipes set, setting loading to false')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recipes'
      setError(errorMessage)
      console.error('[fetchRecipes] Error caught:', error)
    } finally {
      console.log('[fetchRecipes] Finally block - setting loading to false')
      setLoading(false)
    }
  }

  const filterRecipes = () => {
    let filtered = [...recipes]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (recipe) =>
          recipe.title.toLowerCase().includes(query) ||
          recipe.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Tag filter (OR logic - show recipes with ANY selected tag)
    if (selectedTags.length > 0) {
      filtered = filtered.filter((recipe) =>
        recipe.tags.some((tag) => selectedTags.includes(tag))
      )
    }

    setFilteredRecipes(filtered)
  }

  const handleRecipeAdded = () => {
    fetchRecipes()
    setIsModalOpen(false)
  }

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) {
      return
    }

    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchRecipes()
      } else {
        alert('Failed to delete recipe')
      }
    } catch (error) {
      console.error('Error deleting recipe:', error)
      alert('Failed to delete recipe')
    }
  }

  const allTags = Array.from(
    new Set(recipes.flatMap((recipe) => recipe.tags))
  ).sort()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CarrotLoading />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-50 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Recipes</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="bg-white p-4 rounded mb-4">
            <p className="text-sm text-gray-600 mb-2">Troubleshooting steps:</p>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
              <li>Check that your <code className="bg-gray-200 px-1 rounded">.env.local</code> file exists</li>
              <li>Verify <code className="bg-gray-200 px-1 rounded">SUPABASE_URL</code> and <code className="bg-gray-200 px-1 rounded">SUPABASE_ANON_KEY</code> are set</li>
              <li>Check the browser console (F12) for detailed errors</li>
              <li>Check the terminal where <code className="bg-gray-200 px-1 rounded">npm run dev</code> is running</li>
            </ul>
          </div>
          <button
            onClick={() => {
              setLoading(true)
              setError(null)
              fetchRecipes()
            }}
            className="bg-forest-green text-white px-4 py-2 rounded-lg hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            My Cookbook
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-forest-green text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            + Add Recipe
          </button>
        </div>

        {/* Search and Filters */}
        <SearchAndFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          allTags={allTags}
          selectedTags={selectedTags}
          onTagToggle={(tag) => {
            setSelectedTags((prev) =>
              prev.includes(tag)
                ? prev.filter((t) => t !== tag)
                : [...prev, tag]
            )
          }}
        />

        {/* Recipe Grid */}
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              {recipes.length === 0
                ? "No recipes yet. Add your first recipe!"
                : "No recipes match your search or filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onDelete={handleDeleteRecipe}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recipe Input Modal */}
      {isModalOpen && (
        <RecipeInputModal
          onClose={() => setIsModalOpen(false)}
          onRecipeAdded={handleRecipeAdded}
        />
      )}
    </div>
  )
}

