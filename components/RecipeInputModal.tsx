'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import CarrotLoading from './CarrotLoading'

interface RecipeInputModalProps {
  onClose: () => void
  onRecipeAdded: () => void
}

export default function RecipeInputModal({
  onClose,
  onRecipeAdded,
}: RecipeInputModalProps) {
  const [inputType, setInputType] = useState<'url' | 'text'>('url')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExtract = async () => {
    if (!content.trim()) {
      setError('Please enter a URL or recipe text')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const extractResponse = await fetch('/api/extract-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: inputType,
          content: content.trim(),
        }),
      })

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json()
        throw new Error(errorData.error || 'Failed to extract recipe')
      }

      const recipe = await extractResponse.json()

      const saveResponse = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      })

      if (!saveResponse.ok) {
        throw new Error('Failed to save recipe')
      }

      onRecipeAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    const overlay = (
      <div
        className="overlay-fade-in fixed flex items-center justify-center"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100dvh',
          minWidth: '100vw',
          minHeight: '100dvh',
          zIndex: 2147483647,
          isolation: 'isolate',
          transform: 'translateZ(0)',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          className="flex flex-col items-center text-center"
          style={{
            backgroundColor: 'white',
            padding: 64,
            borderRadius: 28,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}
        >
          <CarrotLoading size="cardLarge" noLabel />
          <h3 style={{ fontSize: 24, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>
            Extracting Recipe
          </h3>
          <p className="text-gray-500" style={{ fontSize: 16 }}>
            This will just take a moment...
          </p>
        </div>
      </div>
    )
    if (typeof document !== 'undefined') {
      return createPortal(overlay, document.body)
    }
    return overlay
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-50 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Add Recipe</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setInputType('url')}
              className={`flex-1 py-2 px-4 rounded-xl font-medium transition-colors ${
                inputType === 'url'
                  ? 'bg-forest-green text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              From URL
            </button>
            <button
              onClick={() => setInputType('text')}
              className={`flex-1 py-2 px-4 rounded-xl font-medium transition-colors ${
                inputType === 'text'
                  ? 'bg-forest-green text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              From Text
            </button>
          </div>

          {inputType === 'url' ? (
            <input
              type="url"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste recipe URL here..."
              className="w-full p-3 border border-gray-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-forest-green"
              disabled={loading}
            />
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste recipe text here..."
              rows={10}
              className="w-full p-3 border border-gray-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-forest-green resize-none"
              disabled={loading}
            />
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleExtract}
              disabled={loading || !content.trim()}
              className="flex-1 bg-forest-green text-white py-2 px-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Extract Recipe
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
