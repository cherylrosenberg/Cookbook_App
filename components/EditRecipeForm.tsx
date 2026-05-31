'use client'

import { useState } from 'react'
import { Recipe, RecipeInput } from '@/lib/supabase'
import { ArrowLeft, X } from 'lucide-react'

interface EditRecipeFormProps {
  recipe: Recipe
  onSave: () => void
  onCancel: () => void
}

export default function EditRecipeForm({
  recipe,
  onSave,
  onCancel,
}: EditRecipeFormProps) {
  const [formData, setFormData] = useState<RecipeInput>({
    title: recipe.title,
    servings: recipe.servings,
    prep_time: recipe.prep_time || '',
    cook_time: recipe.cook_time || '',
    total_time: recipe.total_time || '',
    ingredients: recipe.ingredients ?? [],
    instructions: recipe.instructions || [],
    tags: recipe.tags || [],
    source_url: recipe.source_url || '',
    notes: recipe.notes || '',
  })
  const [tagsInput, setTagsInput] = useState<string>(recipe.tags.join(', '))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseTags = (tagsString: string): string[] => {
    return tagsString
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Parse tags from input before submitting
    const parsedTags = parseTags(tagsInput)

    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: parsedTags,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update recipe')
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const updateIngredient = (
    sectionIndex: number,
    itemIndex: number,
    field: 'quantity' | 'ingredient',
    value: string
  ) => {
    const newIngredients = [...formData.ingredients]
    newIngredients[sectionIndex].items[itemIndex][field] = value
    setFormData({ ...formData, ingredients: newIngredients })
  }

  const addIngredientItem = (sectionIndex: number) => {
    const newIngredients = [...formData.ingredients]
    newIngredients[sectionIndex].items.push({
      ingredient: '',
      quantity: '',
    })
    setFormData({ ...formData, ingredients: newIngredients })
  }

  const removeIngredientItem = (sectionIndex: number, itemIndex: number) => {
    const newIngredients = [...formData.ingredients]
    newIngredients[sectionIndex].items.splice(itemIndex, 1)
    setFormData({ ...formData, ingredients: newIngredients })
  }

  const addIngredientSection = () => {
    setFormData({
      ...formData,
      ingredients: [
        ...formData.ingredients,
        {
          section: '',
          items: [{ ingredient: '', quantity: '' }],
        },
      ],
    })
  }

  const removeIngredientSection = (sectionIndex: number) => {
    const newIngredients = formData.ingredients.filter(
      (_, index) => index !== sectionIndex
    )
    setFormData({ ...formData, ingredients: newIngredients })
  }

  const updateSectionName = (sectionIndex: number, name: string) => {
    const newIngredients = [...formData.ingredients]
    newIngredients[sectionIndex].section = name
    setFormData({ ...formData, ingredients: newIngredients })
  }

  const updateInstruction = (index: number, value: string) => {
    const newInstructions = [...formData.instructions]
    newInstructions[index] = value
    setFormData({ ...formData, instructions: newInstructions })
  }

  const addInstruction = () => {
    setFormData({
      ...formData,
      instructions: [...formData.instructions, ''],
    })
  }

  const removeInstruction = (index: number) => {
    const newInstructions = formData.instructions.filter((_, i) => i !== index)
    setFormData({ ...formData, instructions: newInstructions })
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Cancel</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Edit Recipe</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-green"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Servings *
                </label>
                <input
                  type="number"
                  value={formData.servings}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      servings: parseInt(e.target.value) || 4,
                    })
                  }
                  required
                  min="1"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-green"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prep Time
                </label>
                <input
                  type="text"
                  value={formData.prep_time}
                  onChange={(e) =>
                    setFormData({ ...formData, prep_time: e.target.value })
                  }
                  placeholder="15 minutes"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-green"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cook Time
                </label>
                <input
                  type="text"
                  value={formData.cook_time}
                  onChange={(e) =>
                    setFormData({ ...formData, cook_time: e.target.value })
                  }
                  placeholder="30 minutes"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-green"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Time
                </label>
                <input
                  type="text"
                  value={formData.total_time}
                  onChange={(e) =>
                    setFormData({ ...formData, total_time: e.target.value })
                  }
                  placeholder="45 minutes"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-green"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => {
                  setTagsInput(e.target.value)
                  // Update formData tags in real-time for preview, but allow free typing
                  const parsed = parseTags(e.target.value)
                  setFormData({
                    ...formData,
                    tags: parsed,
                  })
                }}
                onBlur={(e) => {
                  // Ensure tags are properly parsed when user leaves the field
                  const parsed = parseTags(e.target.value)
                  setTagsInput(parsed.join(', '))
                  setFormData({
                    ...formData,
                    tags: parsed,
                  })
                }}
                placeholder="Italian, Pasta, Quick"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-green"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source URL
              </label>
              <input
                type="url"
                value={formData.source_url}
                onChange={(e) =>
                  setFormData({ ...formData, source_url: e.target.value })
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-green"
              />
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Ingredients *
              </label>
              <button
                type="button"
                onClick={addIngredientSection}
                className="text-forest-green hover:underline text-sm"
              >
                + Add Section
              </button>
            </div>
            {formData.ingredients.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-6 p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <input
                    type="text"
                    value={section.section}
                    onChange={(e) =>
                      updateSectionName(sectionIndex, e.target.value)
                    }
                    placeholder="Section name (e.g., Main ingredients)"
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-green font-semibold"
                  />
                  {formData.ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredientSection(sectionIndex)}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex gap-2">
                      <input
                        type="text"
                        value={item.quantity}
                        onChange={(e) =>
                          updateIngredient(
                            sectionIndex,
                            itemIndex,
                            'quantity',
                            e.target.value
                          )
                        }
                        placeholder="Quantity"
                        className="w-32 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-green"
                      />
                      <input
                        type="text"
                        value={item.ingredient}
                        onChange={(e) =>
                          updateIngredient(
                            sectionIndex,
                            itemIndex,
                            'ingredient',
                            e.target.value
                          )
                        }
                        placeholder="Ingredient name"
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-green"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          removeIngredientItem(sectionIndex, itemIndex)
                        }
                        className="text-red-600 hover:text-red-800 px-2"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addIngredientItem(sectionIndex)}
                    className="text-forest-green hover:underline text-sm"
                  >
                    + Add Ingredient
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Instructions *
              </label>
              <button
                type="button"
                onClick={addInstruction}
                className="text-forest-green hover:underline text-sm"
              >
                + Add Step
              </button>
            </div>
            <div className="space-y-3">
              {formData.instructions.map((instruction, index) => (
                <div key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-forest-green text-white rounded-full flex items-center justify-center font-bold mt-1">
                    {index + 1}
                  </span>
                  <div className="flex-1 flex gap-2">
                    <textarea
                      value={instruction}
                      onChange={(e) =>
                        updateInstruction(index, e.target.value)
                      }
                      rows={3}
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-green resize-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeInstruction(index)}
                      className="text-red-600 hover:text-red-800 px-2"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-green resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 px-6 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-forest-green text-white py-3 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

