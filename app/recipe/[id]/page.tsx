'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Recipe, RecipeNutrition } from '@/lib/supabase'
import RecipeDetailView from '@/components/RecipeDetailView'
import EditRecipeForm from '@/components/EditRecipeForm'
import CarrotLoading from '@/components/CarrotLoading'

export default function RecipePage() {
  const router = useRouter()
  const params = useParams()
  const recipeId = params.id as string

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchRecipe = useCallback(async () => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}`)
      if (response.ok) {
        const data = await response.json()
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
  }, [recipeId, router])

  useEffect(() => {
    fetchRecipe()
  }, [fetchRecipe])

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

