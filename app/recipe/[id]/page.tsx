'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Recipe, RecipeNutrition } from '@/lib/supabase'
import RecipeDetailView from '@/components/RecipeDetailView'
import EditRecipeForm from '@/components/EditRecipeForm'
import CarrotLoading from '@/components/CarrotLoading'

const PENDING_IMAGE_REFETCH_MS = 10_000

export default function RecipePage() {
  const router = useRouter()
  const params = useParams()
  const recipeId = params.id as string

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const pendingImageRefetchDone = useRef(false)

  const fetchRecipe = useCallback(async () => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}`)
      if (response.ok) {
        const data = await response.json()
        setRecipe(data)
        return data as Recipe
      } else {
        router.push('/')
        return null
      }
    } catch (error) {
      console.error('Error fetching recipe:', error)
      router.push('/')
      return null
    } finally {
      setLoading(false)
    }
  }, [recipeId, router])

  useEffect(() => {
    fetchRecipe()
  }, [fetchRecipe])

  useEffect(() => {
    if (!recipe || recipe.image_url || pendingImageRefetchDone.current) return

    const timer = setTimeout(async () => {
      pendingImageRefetchDone.current = true
      const data = await fetchRecipe()
      if (data?.image_url) {
        setRecipe(data)
      }
    }, PENDING_IMAGE_REFETCH_MS)

    return () => clearTimeout(timer)
  }, [recipe, fetchRecipe])

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
        <CarrotLoading />
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

  const handleNutritionUpdated = (nutrition: RecipeNutrition) => {
    setRecipe((prev) => (prev ? { ...prev, nutrition } : prev))
  }

  return (
    <RecipeDetailView
      recipe={recipe}
      onEdit={() => setIsEditing(true)}
      onDelete={handleDelete}
      onNutritionUpdated={handleNutritionUpdated}
    />
  )
}

