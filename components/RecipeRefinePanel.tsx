'use client'

interface RecipeRefinePanelProps {
  feedback: string
  onFeedbackChange: (value: string) => void
  onRefine: () => void
  disabled?: boolean
  loading?: boolean
}

const QUICK_SUGGESTIONS = [
  'Make it quicker',
  'Fewer steps',
  'Make it vegetarian',
]

export default function RecipeRefinePanel({
  feedback,
  onFeedbackChange,
  onRefine,
  disabled = false,
  loading = false,
}: RecipeRefinePanelProps) {
  const appendSuggestion = (text: string) => {
    const trimmed = feedback.trim()
    onFeedbackChange(trimmed ? `${trimmed}. ${text}` : text)
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mt-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-1">
        Want changes before saving?
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Describe what to change—for example, swap an ingredient you don&apos;t
        have.
      </p>
      <textarea
        value={feedback}
        onChange={(e) => onFeedbackChange(e.target.value)}
        placeholder="e.g. I don't have chickpeas—use black beans instead. Make it quicker."
        rows={4}
        disabled={disabled || loading}
        className="w-full p-3 border border-gray-300 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-forest-green resize-none disabled:opacity-50"
      />
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled || loading}
            onClick={() => appendSuggestion(s)}
            className="text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-50"
          >
            + {s}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onRefine}
        disabled={disabled || loading || !feedback.trim()}
        className="bg-forest-green text-white px-6 py-2 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        Update recipe
      </button>
    </div>
  )
}
