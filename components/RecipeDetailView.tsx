'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Recipe, RawIngredients, IngredientSection } from '@/lib/supabase'
import { ArrowLeft, Edit, Clock, Plus, Minus, Trash2, ExternalLink } from 'lucide-react'
import { scaleQuantity as scaleQuantityUtil, calculateTotalTime } from '@/lib/quantity-parser'

const PLACEHOLDER_GRADIENTS = [
  'bg-placeholder-1',
  'bg-placeholder-2',
  'bg-placeholder-3',
  'bg-placeholder-4',
  'bg-placeholder-5',
  'bg-placeholder-6',
] as const

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function getEmojiForRecipe(recipe: Recipe): string {
  const text = `${recipe.title} ${(recipe.tags || []).join(' ')}`.toLowerCase()
  const map: [RegExp, string][] = [
    [/pasta|noodle|spaghetti|lasagna/, '🍝'],
    [/chicken|poultry/, '🍗'],
    [/beef|steak|burger/, '🥩'],
    [/soup|broth/, '🍲'],
    [/salad/, '🥗'],
    [/cake|cupcake/, '🍰'],
    [/cookie|brownie/, '🍪'],
    [/bread|roll|bagel/, '🍞'],
    [/fish|salmon|tuna|seafood/, '🐟'],
    [/dessert|ice cream|pudding/, '🍨'],
    [/breakfast|pancake|waffle|egg/, '🥞'],
    [/pizza/, '🍕'],
    [/taco|burrito|mexican/, '🌮'],
    [/sushi|rice/, '🍣'],
    [/curry|indian|thai/, '🍛'],
    [/apple|pie|fruit/, '🥧'],
    [/coffee|tea/, '☕'],
    [/smoothie|juice/, '🥤'],
  ]
  for (const [re, emoji] of map) {
    if (re.test(text)) return emoji
  }
  return '🍽️'
}

function getGradientClassForRecipe(recipe: Recipe): string {
  const index = hashId(recipe.id) % PLACEHOLDER_GRADIENTS.length
  return PLACEHOLDER_GRADIENTS[index]
}

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

  const emoji = getEmojiForRecipe(recipe)
  const gradientClass = getGradientClassForRecipe(recipe)

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header image - same as recipe card placeholder */}
        <div
          className={`${gradientClass} h-40 md:h-48 -mx-4 md:-mx-6 lg:-mx-8 mb-6 rounded-xl flex items-center justify-center overflow-hidden`}
        >
          <span className="text-6xl md:text-7xl" role="img" aria-hidden>
            {emoji}
          </span>
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

        {/* Serving Size Adjuster */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1 font-medium tracking-[0.5px] uppercase">Servings</div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-forest-green">
                  {scaledServings}
                </span>
                {servingMultiplier !== 1 && (
                  <span className="text-sm text-gray-500 font-normal">
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
        <div className="bg-gray-50 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 tracking-[0.5px]">Ingredients</h2>
          {/* Render ingredients - handle normalization */}
          {(() => {
            // Normalize ingredients to ensure it's always an array
            // Handle different data structures: array, string, or { optional: [], sections: [] }
            let ingredients: IngredientSection[] = []
            
            if (recipe.ingredients) {
              if (typeof recipe.ingredients === 'string') {
                try {
                  const parsed = JSON.parse(recipe.ingredients)
                  ingredients = Array.isArray(parsed) ? parsed : []
                } catch (e) {
                  console.error('Failed to parse ingredients JSON:', e)
                  ingredients = []
                }
              } else if (Array.isArray(recipe.ingredients)) {
                ingredients = recipe.ingredients
              } else if (typeof recipe.ingredients === 'object') {
                // Handle structure: { optional: [], sections: [] }
                // Type guard to check if it's RawIngredients format
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
                
                ingredients = normalized
              }
            }
            
            // Debug log (can be removed later)
            if (ingredients.length === 0) {
              console.log('No ingredients found. Raw data:', recipe.ingredients)
            }
            
            if (!Array.isArray(ingredients) || ingredients.length === 0) {
              return (
                <div className="text-gray-500 py-4 font-normal">
                  <p>No ingredients available</p>
                  {process.env.NODE_ENV === 'development' && (
                    <pre className="text-xs mt-2 bg-gray-100 p-2 rounded-xl font-normal">
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
              const isLast = sectionIndex === ingredients.length - 1
              
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
          })()}
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

