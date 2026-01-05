'use client'

import { Recipe } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Clock, Users, Trash2 } from 'lucide-react'
import { calculateTotalTime } from '@/lib/quantity-parser'

interface RecipeCardProps {
  recipe: Recipe
  onDelete: (id: string) => void
}

export default function RecipeCard({ recipe, onDelete }: RecipeCardProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/recipe/${recipe.id}`)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(recipe.id)
  }

  const displayTags = recipe.tags.slice(0, 3)
  const remainingTags = recipe.tags.length - 3

  // Calculate total_time if not provided
  const totalTime = calculateTotalTime(
    recipe.prep_time,
    recipe.cook_time,
    recipe.total_time
  )

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer flex flex-col h-full"
    >
      <div className="p-4 flex-1">
        <h3 className="font-semibold text-gray-800 text-lg mb-3 line-clamp-2 min-h-[3rem]">
          {recipe.title}
        </h3>

        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
          {totalTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{totalTime}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{recipe.servings}</span>
          </div>
        </div>

        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {displayTags.map((tag, index) => (
              <span
                key={index}
                className="bg-light-green text-forest-green text-xs px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
            {remainingTags > 0 && (
              <span className="bg-light-green text-forest-green text-xs px-2 py-1 rounded-full">
                +{remainingTags}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 flex justify-end">
        <button
          onClick={handleDelete}
          className="text-red-600 hover:text-red-800 p-2 rounded transition-colors"
          aria-label="Delete recipe"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

