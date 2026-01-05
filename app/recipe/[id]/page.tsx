'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Recipe } from '@/lib/supabase'
import RecipeDetailView from '@/components/RecipeDetailView'
import EditRecipeForm from '@/components/EditRecipeForm'

export default function RecipePage() {
  const router = useRouter()
  const params = useParams()
  const recipeId = params.id as string

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecipe()
  }, [recipeId])

  const fetchRecipe = async () => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}`)
      if (response.ok) {
        const data = await response.json()
        
        // Normalize ingredients - handle different data structures
        // Supabase JSONB might return as string in some cases
        // Gemini may return: { optional: [], sections: [] } instead of array of sections
        if (data.ingredients) {
          if (typeof data.ingredients === 'string') {
            try {
              data.ingredients = JSON.parse(data.ingredients)
            } catch (e) {
              console.error('Failed to parse ingredients:', e)
              data.ingredients = []
            }
          }
          
          // Handle the actual structure from Gemini: { optional: [], sections: [] }
          if (data.ingredients && typeof data.ingredients === 'object' && !Array.isArray(data.ingredients)) {
            const normalized: any[] = []
            
            // Add sections array
            if (Array.isArray(data.ingredients.sections)) {
              normalized.push(...data.ingredients.sections)
            }
            
            // Add optional ingredients as a section
            if (Array.isArray(data.ingredients.optional) && data.ingredients.optional.length > 0) {
              normalized.push({
                section: 'Optional ingredients',
                items: data.ingredients.optional
              })
            }
            
            data.ingredients = normalized.length > 0 ? normalized : []
          }
          
          if (!Array.isArray(data.ingredients)) {
            console.warn('Ingredients is not an array after normalization, defaulting to empty array:', data.ingredients)
            data.ingredients = []
          }
        } else {
          data.ingredients = []
        }
        
        setRecipe(data)
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Error fetching recipe:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const handleRecipeUpdated = () => {
    fetchRecipe()
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this recipe?')) {
      return
    }

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/')
      } else {
        alert('Failed to delete recipe')
      }
    } catch (error) {
      console.error('Error deleting recipe:', error)
      alert('Failed to delete recipe')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-forest-green text-xl">Loading recipe...</div>
      </div>
    )
  }

  if (!recipe) {
    return null
  }

  if (isEditing) {
    return (
      <EditRecipeForm
        recipe={recipe}
        onSave={handleRecipeUpdated}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  return (
    <RecipeDetailView
      recipe={recipe}
      onEdit={() => setIsEditing(true)}
      onDelete={handleDelete}
    />
  )
}

