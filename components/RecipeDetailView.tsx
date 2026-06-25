'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Recipe, RecipeNutrition } from '@/lib/supabase'
import AppNav from '@/components/AppNav'
import RecipeNutritionPanel from '@/components/RecipeNutritionPanel'
import CarrotLoading from '@/components/CarrotLoading'
import { ArrowLeft, Edit, Clock, Plus, Minus, Trash2, ExternalLink, ImageIcon } from 'lucide-react'
import { scaleQuantity as scaleQuantityUtil, calculateTotalTime } from '@/lib/quantity-parser'
import {
  getEmojiForRecipe,
  getGradientClassForRecipe,
} from '@/lib/recipe-display'

interface RecipeDetailViewProps {
  recipe: Recipe
  onEdit: () => void
  onDelete: () => void
  onNutritionUpdated: (nutrition: RecipeNutrition) => void
  onImageUpdated: (imageUrl: string) => void
}

export default function RecipeDetailView({
  recipe,
  onEdit,
  onDelete,
  onNutritionUpdated,
  onImageUpdated,
}: RecipeDetailViewProps) {
  const router = useRouter()
  const [servingMultiplier, setServingMultiplier] = useState(1)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const originalServings = recipe.servings

  const adjustServings = (delta: number) => {
    const newMultiplier = Math.max(0.5, servingMultiplier + delta)
    setServingMultiplier(newMultiplier)
  }

  const scaledServings = Math.round(originalServings * servingMultiplier)

  // Calculate total_time if not provided
  const totalTime = calculateTotalTime(
    recipe.prep_time,
    recipe.cook_time,
    recipe.total_time
  )

  const emoji = getEmojiForRecipe(recipe)
  const gradientClass = getGradientClassForRecipe(recipe)

  const runGenerateImage = async () => {
    setImageLoading(true)
    setImageError(null)
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/generate-image`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.error || `HTTP ${res.status}`
        if (res.status === 503 || msg.includes('503')) {
          throw new Error(
            'Image service is busy. Please wait a moment and try again.'
          )
        }
        throw new Error(msg)
      }
      if (data.image_url) {
        onImageUpdated(data.image_url as string)
      }
    } catch (err) {
      setImageError(
        err instanceof Error ? err.message : 'Failed to generate image'
      )
    } finally {
      setImageLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <AppNav />
        {/* Header image */}
        <div className="relative -mx-4 md:-mx-6 lg:-mx-8 mb-6">
          <div
            className={`${gradientClass} h-40 md:h-48 rounded-xl flex items-center justify-center overflow-hidden`}
          >
            {recipe.image_url ? (
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="h-full w-full object-cover"
              />
            ) : imageLoading ? (
              <CarrotLoading size="small" noLabel />
            ) : (
              <span className="text-6xl md:text-7xl" role="img" aria-hidden>
                {emoji}
              </span>
            )}
          </div>
          <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4">
            <button
              type="button"
              onClick={runGenerateImage}
              disabled={imageLoading}
              className="flex items-center gap-1.5 bg-white/90 hover:bg-white text-gray-800 text-sm font-medium px-3 py-1.5 rounded-full shadow-sm transition-colors disabled:opacity-60"
            >
              <ImageIcon className="w-4 h-4" />
              {recipe.image_url ? 'Regenerate image' : 'Generate image'}
            </button>
          </div>
          {imageError && (
            <p className="text-sm text-red-600 mt-2 px-1">{imageError}</p>
          )}
        </div>

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Library</span>
          </button>

          <div className="flex justify-between items-start gap-4 mb-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 flex-1">
              {recipe.title}
            </h1>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onEdit}
                className="text-forest-green hover:opacity-80 p-2 rounded-lg transition-opacity"
                aria-label="Edit recipe"
              >
                <Edit className="w-6 h-6" />
              </button>
              <button
                onClick={onDelete}
                className="text-forest-green hover:opacity-80 p-2 rounded-lg transition-opacity"
                aria-label="Delete recipe"
              >
                <Trash2 className="w-6 h-6" />
              </button>
            </div>
          </div>

          {recipe.source_url && (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-forest-green hover:underline flex items-center gap-1 text-sm mb-4 font-normal"
            >
              <ExternalLink className="w-4 h-4" />
              View Original Recipe
            </a>
          )}

          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-white text-gray-800 text-sm font-normal px-3 py-1.5 rounded-full border border-gray-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Time Information */}
        {(recipe.prep_time || recipe.cook_time || totalTime) && (
          <div className="bg-gray-50 rounded-xl p-6 mb-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recipe.prep_time && (
                <div>
                  <div className="text-sm text-gray-600 mb-1 font-medium tracking-[0.5px] uppercase">Prep Time</div>
                  <div className="flex items-center gap-2 text-gray-800 font-semibold">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <span>{recipe.prep_time}</span>
                  </div>
                </div>
              )}
              {recipe.cook_time && (
                <div>
                  <div className="text-sm text-gray-600 mb-1 font-medium tracking-[0.5px] uppercase">Cook Time</div>
                  <div className="flex items-center gap-2 text-gray-800 font-semibold">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <span>{recipe.cook_time}</span>
                  </div>
                </div>
              )}
              {totalTime && (
                <div>
                  <div className="text-sm text-gray-600 mb-1 font-medium tracking-[0.5px] uppercase">Total Time</div>
                  <div className="flex items-center gap-2 text-gray-800 font-semibold">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <span>{totalTime}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <RecipeNutritionPanel
          recipe={recipe}
          servingMultiplier={servingMultiplier}
          onNutritionUpdated={onNutritionUpdated}
        />

        {/* Ingredients */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-gray-800 tracking-[0.5px]">
              Ingredients
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide hidden sm:inline">
                Servings
              </span>
              <button
                onClick={() => adjustServings(-0.5)}
                className="bg-forest-green text-white rounded-full w-8 h-8 flex items-center justify-center hover:opacity-90 transition-opacity"
                aria-label="Decrease servings"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span
                className="text-lg font-bold text-forest-green min-w-[1.5rem] text-center tabular-nums"
                title={
                  servingMultiplier !== 1
                    ? `Original: ${originalServings} servings`
                    : undefined
                }
              >
                {scaledServings}
              </span>
              <button
                onClick={() => adjustServings(0.5)}
                className="bg-forest-green text-white rounded-full w-8 h-8 flex items-center justify-center hover:opacity-90 transition-opacity"
                aria-label="Increase servings"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          {recipe.ingredients.length === 0 ? (
            <div className="text-gray-500 py-4 font-normal">
              <p>No ingredients available</p>
            </div>
          ) : (
            recipe.ingredients.map((section, sectionIndex) => {
              const items = section.items ?? []
              const sectionName = section.section || 'Ingredients'
              const isLast = sectionIndex === recipe.ingredients.length - 1

              if (items.length === 0) {
                return (
                  <div key={sectionIndex} className={`pb-6 ${!isLast ? 'mb-6 border-b border-gray-200' : ''}`}>
                    <h3 className="text-lg font-semibold text-gray-700 mb-3 tracking-[0.5px]">
                      {sectionName}
                    </h3>
                    <p className="text-gray-500 text-sm font-normal">No items in this section</p>
                  </div>
                )
              }

              return (
                <div key={sectionIndex} className={`pb-6 ${!isLast ? 'mb-6 border-b border-gray-200' : ''}`}>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 tracking-[0.5px]">
                    {sectionName}
                  </h3>
                  <ul className="space-y-2">
                    {items.map((item, itemIndex) => {
                      const ingredient = item.ingredient?.trim()
                      if (!ingredient) {
                        return null
                      }

                      const scaledQuantity =
                        servingMultiplier === 1
                          ? item.quantity
                          : item.quantity
                            ? scaleQuantityUtil(item.quantity, servingMultiplier)
                            : ''

                      return (
                        <li key={itemIndex} className="flex gap-2 font-normal">
                          {scaledQuantity && (
                            <span className="font-semibold text-forest-green min-w-[80px]">
                              {scaledQuantity}
                            </span>
                          )}
                          <span className="text-gray-700">{ingredient}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })
          )}
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 tracking-[0.5px]">Instructions</h2>
          <ol className="space-y-4">
            {recipe.instructions.map((instruction, index) => {
              // Remove leading numbers and periods/dots (e.g., "1. ", "2.", "3) ", etc.)
              const cleanedInstruction = instruction.replace(/^\d+[\.\)]\s*/, '').trim()
              return (
                <li key={index} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-forest-green text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </span>
                  <span className="text-gray-700 flex-1 pt-1 font-normal">{cleanedInstruction}</span>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Notes */}
        {recipe.notes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-2 tracking-[0.5px]">Notes</h2>
            <p className="text-gray-700 whitespace-pre-wrap font-normal">{recipe.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

