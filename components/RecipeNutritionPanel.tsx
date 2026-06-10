'use client'

import { useState } from 'react'
import { Recipe, RecipeNutrition } from '@/lib/supabase'
import { isNutritionStale, scaleNutritionPerServing } from '@/lib/nutrition'
import CarrotLoading from '@/components/CarrotLoading'

interface RecipeNutritionPanelProps {
  recipe: Recipe
  servingMultiplier: number
  onNutritionUpdated: (nutrition: RecipeNutrition) => void
}

function formatMacro(value: number, unit: string): string {
  const rounded = Number.isInteger(value) ? value : value.toFixed(1)
  return `${rounded}${unit}`
}

export default function RecipeNutritionPanel({
  recipe,
  servingMultiplier,
  onNutritionUpdated,
}: RecipeNutritionPanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stale = isNutritionStale(recipe)
  const nutrition = recipe.nutrition
  const scaled = nutrition
    ? scaleNutritionPerServing(nutrition.per_serving, servingMultiplier)
    : null

  const runEstimate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/recipes/${recipe.id}/estimate-nutrition`,
        { method: 'POST' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.error || `HTTP ${res.status}`
        if (res.status === 503 || msg.includes('503')) {
          throw new Error(
            'Nutrition service is busy. Please wait a moment and try again.'
          )
        }
        throw new Error(msg)
      }
      if (data.nutrition) {
        onNutritionUpdated(data.nutrition as RecipeNutrition)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to estimate nutrition'
      )
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-xl px-4 py-3 mb-6 shadow-sm flex items-center gap-3">
        <CarrotLoading size="small" noLabel />
        <span className="text-sm text-gray-600">Estimating nutrition…</span>
      </div>
    )
  }

  if (!nutrition || !scaled) {
    return (
      <div className="bg-gray-50 rounded-xl px-4 py-3 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-600">
            AI-estimated nutrition per serving.
          </p>
          <button
            type="button"
            onClick={runEstimate}
            className="bg-forest-green text-white px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity font-medium text-sm shrink-0"
          >
            Estimate nutrition
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">
            {error}{' '}
            <button
              type="button"
              onClick={runEstimate}
              className="text-forest-green font-medium underline"
            >
              Try again
            </button>
          </p>
        )}
      </div>
    )
  }

  const parts: string[] = [
    `${scaled.calories} kcal`,
    `${formatMacro(scaled.protein_g, 'g')} protein`,
    `${formatMacro(scaled.fat_g, 'g')} fat`,
    `${formatMacro(scaled.carbohydrates_g, 'g')} carbs`,
  ]
  if (scaled.fiber_g != null) {
    parts.push(`${formatMacro(scaled.fiber_g, 'g')} fiber`)
  }
  if (scaled.sugar_g != null) {
    parts.push(`${formatMacro(scaled.sugar_g, 'g')} sugar`)
  }
  if (scaled.sodium_mg != null) {
    parts.push(`${formatMacro(scaled.sodium_mg, ' mg')} sodium`)
  }

  return (
    <div className="bg-gray-50 rounded-xl px-4 py-3 mb-6 shadow-sm space-y-2">
      {stale && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
          Nutrition may be outdated.{' '}
          <button
            type="button"
            onClick={runEstimate}
            className="text-forest-green font-medium underline"
          >
            Re-estimate
          </button>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-xs font-medium text-amber-900 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
          Estimated
        </span>
        <span className="text-gray-800 font-medium">
          {parts.join(' · ')}
        </span>
        {servingMultiplier !== 1 && (
          <span className="text-gray-500 text-xs">
            ({Math.round(recipe.servings * servingMultiplier)} servings)
          </span>
        )}
        {!stale && (
          <button
            type="button"
            onClick={runEstimate}
            className="text-xs text-forest-green font-medium hover:underline shrink-0 ml-auto"
          >
            Re-estimate
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
