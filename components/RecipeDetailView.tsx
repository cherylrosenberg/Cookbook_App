'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Recipe } from '@/lib/supabase'
import { ArrowLeft, Edit, Clock, Users, Plus, Minus, Trash2, ExternalLink } from 'lucide-react'
import { scaleQuantity as scaleQuantityUtil, calculateTotalTime } from '@/lib/quantity-parser'

interface RecipeDetailViewProps {
  recipe: Recipe
  onEdit: () => void
  onDelete: () => void
}

export default function RecipeDetailView({
  recipe,
  onEdit,
  onDelete,
}: RecipeDetailViewProps) {
  const router = useRouter()
  const [servingMultiplier, setServingMultiplier] = useState(1)
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

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Library</span>
          </button>

          <div className="flex justify-between items-start gap-4 mb-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 flex-1">
              {recipe.title}
            </h1>
            <button
              onClick={onEdit}
              className="text-forest-green hover:opacity-80 p-2"
              aria-label="Edit recipe"
            >
              <Edit className="w-6 h-6" />
            </button>
          </div>

          {recipe.source_url && (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-forest-green hover:underline flex items-center gap-1 text-sm mb-4"
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
                  className="bg-light-green text-forest-green text-sm px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Time Information */}
        {(recipe.prep_time || recipe.cook_time || totalTime) && (
          <div className="bg-light-green rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recipe.prep_time && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Prep Time</div>
                  <div className="flex items-center gap-2 text-forest-green font-semibold">
                    <Clock className="w-5 h-5" />
                    <span>{recipe.prep_time}</span>
                  </div>
                </div>
              )}
              {recipe.cook_time && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Cook Time</div>
                  <div className="flex items-center gap-2 text-forest-green font-semibold">
                    <Clock className="w-5 h-5" />
                    <span>{recipe.cook_time}</span>
                  </div>
                </div>
              )}
              {totalTime && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Total Time</div>
                  <div className="flex items-center gap-2 text-forest-green font-semibold">
                    <Clock className="w-5 h-5" />
                    <span>{totalTime}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Serving Size Adjuster */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Servings</div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-forest-green">
                  {scaledServings}
                </span>
                {servingMultiplier !== 1 && (
                  <span className="text-sm text-gray-500">
                    (original: {originalServings})
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => adjustServings(-0.5)}
                className="bg-forest-green text-white rounded-full w-10 h-10 flex items-center justify-center hover:opacity-90 transition-opacity"
                aria-label="Decrease servings"
              >
                <Minus className="w-5 h-5" />
              </button>
              <button
                onClick={() => adjustServings(0.5)}
                className="bg-forest-green text-white rounded-full w-10 h-10 flex items-center justify-center hover:opacity-90 transition-opacity"
                aria-label="Increase servings"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Ingredients</h2>
          {/* Render ingredients - handle normalization */}
          {(() => {
            // Normalize ingredients to ensure it's always an array
            // Handle different data structures: array, string, or { optional: [], sections: [] }
            let ingredients: any[] = []
            
            if (recipe.ingredients) {
              if (typeof recipe.ingredients === 'string') {
                try {
                  ingredients = JSON.parse(recipe.ingredients)
                } catch (e) {
                  console.error('Failed to parse ingredients JSON:', e)
                  ingredients = []
                }
              } else if (Array.isArray(recipe.ingredients)) {
                ingredients = recipe.ingredients
              } else if (typeof recipe.ingredients === 'object') {
                // Handle structure: { optional: [], sections: [] }
                const normalized: any[] = []
                
                if (Array.isArray(recipe.ingredients.sections)) {
                  normalized.push(...recipe.ingredients.sections)
                }
                
                if (Array.isArray(recipe.ingredients.optional) && recipe.ingredients.optional.length > 0) {
                  normalized.push({
                    section: 'Optional ingredients',
                    items: recipe.ingredients.optional
                  })
                }
                
                ingredients = normalized
              }
            }
            
            // Debug log (can be removed later)
            if (ingredients.length === 0) {
              console.log('No ingredients found. Raw data:', recipe.ingredients)
            }
            
            if (!Array.isArray(ingredients) || ingredients.length === 0) {
              return (
                <div className="text-gray-500 py-4">
                  <p>No ingredients available</p>
                  {process.env.NODE_ENV === 'development' && (
                    <pre className="text-xs mt-2 bg-gray-100 p-2 rounded">
                      Debug: {JSON.stringify(recipe.ingredients, null, 2)}
                    </pre>
                  )}
                </div>
              )
            }
            
            return ingredients.map((section, sectionIndex) => {
              // Validate section structure
              if (!section || typeof section !== 'object') {
                return null
              }
              
              // Get items array - handle both 'items' and direct array format
              const items = Array.isArray(section.items) 
                ? section.items 
                : Array.isArray(section) 
                  ? section 
                  : []
              
              const sectionName = section.section || 'Ingredients'
              
              if (items.length === 0) {
                return (
                  <div key={sectionIndex} className="mb-6 last:mb-0">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">
                      {sectionName}
                    </h3>
                    <p className="text-gray-500 text-sm">No items in this section</p>
                  </div>
                )
              }
              
              return (
                <div key={sectionIndex} className="mb-6 last:mb-0">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    {sectionName}
                  </h3>
                  <ul className="space-y-2">
                    {items.map((item: any, itemIndex: number) => {
                      // Handle different item formats
                      const quantity = item?.quantity || item?.qty || ''
                      const ingredient = item?.ingredient || item?.name || item?.text || String(item)
                      
                      if (!ingredient) {
                        return null
                      }
                      
                      const scaledQuantity =
                        servingMultiplier === 1
                          ? quantity
                          : quantity ? scaleQuantityUtil(quantity, servingMultiplier) : ''
                      
                      return (
                        <li key={itemIndex} className="flex gap-2">
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
          })()}
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Instructions</h2>
          <ol className="space-y-4">
            {recipe.instructions.map((instruction, index) => {
              // Remove leading numbers and periods/dots (e.g., "1. ", "2.", "3) ", etc.)
              const cleanedInstruction = instruction.replace(/^\d+[\.\)]\s*/, '').trim()
              return (
                <li key={index} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-forest-green text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <span className="text-gray-700 flex-1 pt-1">{cleanedInstruction}</span>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Notes */}
        {recipe.notes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Notes</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{recipe.notes}</p>
          </div>
        )}

        {/* Delete Button */}
        <div className="flex justify-end">
          <button
            onClick={onDelete}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Delete Recipe
          </button>
        </div>
      </div>
    </div>
  )
}

