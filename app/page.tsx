'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Recipe } from '@/lib/supabase'
import RecipeCard from '@/components/RecipeCard'
import RecipeInputModal from '@/components/RecipeInputModal'
import SearchAndFilters from '@/components/SearchAndFilters'
import CarrotLoading from '@/components/CarrotLoading'
import { Search } from 'lucide-react'

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)

  const headerChangeAt = useRef(0)
  useEffect(() => {
    const THRESHOLD = 60
    const COOLDOWN_MS = 400 // ignore scroll right after we change state (stops layout-shift bounce)
    let tick: ReturnType<typeof setTimeout> | null = null
    const onScroll = () => {
      if (tick) clearTimeout(tick)
      tick = setTimeout(() => {
        if (Date.now() - headerChangeAt.current < COOLDOWN_MS) return
        const next = window.scrollY > THRESHOLD
        setHeaderCollapsed((prev) => {
          if (prev !== next) headerChangeAt.current = Date.now()
          return next
        })
        tick = null
      }, 80)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (tick) clearTimeout(tick)
    }
  }, [])

  const filterRecipes = useCallback(() => {
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
  }, [recipes, searchQuery, selectedTags])

  useEffect(() => {
    fetchRecipes()
  }, [])

  useEffect(() => {
    filterRecipes()
  }, [filterRecipes])

  const fetchRecipes = async () => {
    try {
      setError(null)
      setLoading(true)

      const response = await fetch('/api/recipes')

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setRecipes(Array.isArray(data) ? data : [])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recipes'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
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
        {/* Header - sticky, collapses to search + button when scrolled */}
        <div className="sticky top-0 z-20 mb-8 md:mb-10 bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden transition-[padding] duration-300 ease-out">
          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              headerCollapsed ? 'max-h-0 opacity-0 pt-0 pb-0' : 'max-h-40 opacity-100'
            }`}
          >
            <div className="px-5 md:px-6 pt-5 md:pt-6 pb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">
                My Cookbook
              </h1>
              <p className="text-gray-600 text-sm md:text-base max-w-xl">
                All your favorite recipes from around the web, saved in one, easy to access place
              </p>
            </div>
          </div>
          <div className={`px-5 md:px-6 flex flex-col sm:flex-row sm:items-center gap-3 transition-[padding] duration-300 ${
            headerCollapsed ? 'py-4' : 'pb-5 md:pb-6 pt-2'
          }`}>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-forest-green text-white px-6 py-3 rounded-full hover:opacity-90 transition-opacity font-medium shrink-0 order-2 sm:order-1"
            >
              + Add Recipe
            </button>
            <div className="relative flex-1 min-w-0 order-1 sm:order-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipes by title or tags..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-green focus:border-transparent bg-gray-50/80"
              />
            </div>
          </div>
        </div>

        {/* Tag filters */}
        <SearchAndFilters
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
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

