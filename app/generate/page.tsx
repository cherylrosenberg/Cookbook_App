'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppNav from '@/components/AppNav'
import ChipInput from '@/components/ChipInput'
import GeneratedRecipePreview from '@/components/GeneratedRecipePreview'
import LoadingOverlay from '@/components/LoadingOverlay'
import RecipeRefinePanel from '@/components/RecipeRefinePanel'
import {
  GenerateRecipeRequest,
  GenerateRecipeResponse,
} from '@/lib/supabase'

export default function GeneratePage() {
  const router = useRouter()
  const previewRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [keyIngredients, setKeyIngredients] = useState<string[]>([])
  const [includeUserSettings, setIncludeUserSettings] = useState(true)
  const [generatedResult, setGeneratedResult] =
    useState<GenerateRecipeResponse | null>(null)
  const [feedback, setFeedback] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Generating recipe…')
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const scrollToPreview = () => {
    previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const runGenerate = async (body: GenerateRecipeRequest) => {
    setIsGenerating(true)
    setError(null)
    setSaveStatus('idle')
    setSaveError(null)

    try {
      const res = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.error || `HTTP ${res.status}`
        if (res.status === 503 || msg.includes('503')) {
          throw new Error(
            'Recipe service is busy. Please wait a moment and try again.'
          )
        }
        throw new Error(msg)
      }
      setGeneratedResult(data as GenerateRecipeResponse)
      setTimeout(scrollToPreview, 100)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate recipe'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerate = () => {
    const q = query.trim()
    if (!q) return
    setLoadingMessage('Generating recipe…')
    runGenerate({
      query: q,
      key_ingredients: keyIngredients,
      include_user_settings: includeUserSettings,
    })
  }

  const handleRefine = () => {
    const q = query.trim()
    const fb = feedback.trim()
    if (!q || !fb || !generatedResult?.recipe) return
    setLoadingMessage('Updating recipe…')
    runGenerate({
      query: q,
      key_ingredients: keyIngredients,
      include_user_settings: includeUserSettings,
      feedback: fb,
      previous_recipe: generatedResult.recipe,
    })
  }

  const handleStartOver = () => {
    setGeneratedResult(null)
    setFeedback('')
    setError(null)
    setSaveStatus('idle')
    setSaveError(null)
  }

  const handleSave = async () => {
    if (!generatedResult?.recipe || saveStatus === 'saved') return
    setSaveStatus('saving')
    setSaveError(null)
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatedResult.recipe),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save recipe')
      }
      const saved = await res.json()
      setSaveStatus('saved')
      router.push(`/recipe/${saved.id}`)
    } catch (err) {
      setSaveStatus('error')
      setSaveError(
        err instanceof Error ? err.message : 'Failed to save recipe'
      )
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      {isGenerating && (
        <LoadingOverlay
          title={loadingMessage}
          subtitle="This may take 20–30 seconds"
        />
      )}

      <div className="max-w-3xl mx-auto">
        <AppNav />
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Generate a recipe
        </h1>
        <p className="text-gray-600 mb-8">
          Describe what you want to cook and add key ingredients to focus the
          recipe. After generation, staples from kitchen settings are used to
          note what you may not have on hand. Review before saving.
        </p>

        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6 mb-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What would you like to cook?
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. quick vegetarian dinner with chickpeas and spinach"
              rows={3}
              disabled={isGenerating}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-green resize-none disabled:opacity-50"
            />
          </div>

          <div>
            <ChipInput
              label="Key ingredients (optional)"
              values={keyIngredients}
              onChange={setKeyIngredients}
              placeholder="e.g. chickpeas, spinach, lemon"
              disabled={isGenerating}
            />
            <p className="text-xs text-gray-500 mt-1">
              Ingredients you want this recipe built around. The recipe may
              include others.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeUserSettings}
              onChange={(e) => setIncludeUserSettings(e.target.checked)}
              disabled={isGenerating}
              className="rounded border-gray-300 text-forest-green focus:ring-forest-green"
            />
            Use my kitchen settings (staples, diets, preferences)
          </label>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
              <button
                type="button"
                onClick={handleGenerate}
                className="block mt-2 text-forest-green font-medium underline"
              >
                Try again
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !query.trim()}
            className="w-full sm:w-auto bg-forest-green text-white px-8 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
          >
            Generate recipe
          </button>
        </div>

        {generatedResult && (
          <div ref={previewRef}>
            <GeneratedRecipePreview
              recipe={generatedResult.recipe}
              meta={generatedResult.meta}
            />

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                type="button"
                onClick={handleSave}
                disabled={
                  isGenerating ||
                  saveStatus === 'saving' ||
                  saveStatus === 'saved'
                }
                className="bg-forest-green text-white px-8 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
              >
                {saveStatus === 'saving'
                  ? 'Saving…'
                  : saveStatus === 'saved'
                    ? 'Saved'
                    : 'Save to cookbook'}
              </button>
              <button
                type="button"
                onClick={handleStartOver}
                disabled={isGenerating}
                className="px-6 py-3 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-medium"
              >
                Start over
              </button>
            </div>

            {saveError && (
              <p className="mt-2 text-sm text-red-600">{saveError}</p>
            )}

            <RecipeRefinePanel
              feedback={feedback}
              onFeedbackChange={setFeedback}
              onRefine={handleRefine}
              disabled={isGenerating || saveStatus === 'saved'}
              loading={isGenerating}
            />
          </div>
        )}
      </div>
    </div>
  )
}
