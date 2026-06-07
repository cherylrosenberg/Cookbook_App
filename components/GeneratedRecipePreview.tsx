'use client'

import { RecipeInput } from '@/lib/supabase'
import { calculateTotalTime } from '@/lib/quantity-parser'
import { Clock } from 'lucide-react'

interface GeneratedRecipePreviewProps {
  recipe: RecipeInput
  meta?: {
    generation_model?: string
    key_ingredient_tokens?: string[]
    not_on_staples_pantry?: string[]
    refinement?: boolean
  }
}

export default function GeneratedRecipePreview({
  recipe,
  meta,
}: GeneratedRecipePreviewProps) {
  const totalTime = calculateTotalTime(
    recipe.prep_time,
    recipe.cook_time,
    recipe.total_time
  )

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6">
      {meta?.refinement && (
        <p className="text-sm text-forest-green font-medium mb-3">
          Revised recipe
        </p>
      )}
      <h2 className="text-2xl font-bold text-gray-800 mb-3">{recipe.title}</h2>

      {meta?.not_on_staples_pantry &&
        meta.not_on_staples_pantry.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            <p className="font-medium mb-1">You may not have on hand</p>
            <p>{meta.not_on_staples_pantry.join(', ')}</p>
          </div>
        )}

      {recipe.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {recipe.tags.map((tag, i) => (
            <span
              key={i}
              className="bg-gray-50 text-gray-800 text-sm px-3 py-1 rounded-full border border-gray-200"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-sm">
        <div>
          <span className="text-gray-500 uppercase tracking-wide text-xs">
            Servings
          </span>
          <p className="font-semibold text-gray-800">{recipe.servings}</p>
        </div>
        {recipe.prep_time && (
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-gray-500 mt-0.5" />
            <div>
              <span className="text-gray-500 uppercase tracking-wide text-xs">
                Prep
              </span>
              <p className="font-semibold text-gray-800">{recipe.prep_time}</p>
            </div>
          </div>
        )}
        {recipe.cook_time && (
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-gray-500 mt-0.5" />
            <div>
              <span className="text-gray-500 uppercase tracking-wide text-xs">
                Cook
              </span>
              <p className="font-semibold text-gray-800">{recipe.cook_time}</p>
            </div>
          </div>
        )}
        {totalTime && !recipe.prep_time && !recipe.cook_time && (
          <div>
            <span className="text-gray-500 uppercase tracking-wide text-xs">
              Total
            </span>
            <p className="font-semibold text-gray-800">{totalTime}</p>
          </div>
        )}
      </div>

      <h3 className="text-lg font-semibold text-gray-800 mb-3">Ingredients</h3>
      {recipe.ingredients.map((section, si) => (
        <div key={si} className="mb-4">
          {section.section && section.section !== 'Main' && (
            <h4 className="font-medium text-gray-700 mb-2">{section.section}</h4>
          )}
          <ul className="list-disc list-inside space-y-1 text-gray-800">
            {section.items.map((item, ii) => (
              <li key={ii}>
                {item.quantity && (
                  <span className="font-medium">{item.quantity} </span>
                )}
                {item.ingredient}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <h3 className="text-lg font-semibold text-gray-800 mb-3 mt-6">
        Instructions
      </h3>
      <ol className="list-decimal list-inside space-y-2 text-gray-800">
        {recipe.instructions.map((step, i) => (
          <li key={i} className="pl-1">
            {step}
          </li>
        ))}
      </ol>

      {recipe.notes && (
        <p className="mt-6 text-sm text-gray-600 italic border-t border-gray-100 pt-4">
          {recipe.notes}
        </p>
      )}

      {meta &&
        (meta.generation_model || meta.key_ingredient_tokens?.length) && (
        <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-1">
          {meta.generation_model && (
            <p>Model: {meta.generation_model}</p>
          )}
          {meta.key_ingredient_tokens &&
            meta.key_ingredient_tokens.length > 0 && (
              <p>
                Key ingredient tokens: {meta.key_ingredient_tokens.join(', ')}
              </p>
            )}
        </div>
      )}
    </div>
  )
}
