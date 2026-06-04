'use client'

import { useState } from 'react'
import { SkillLevel, UserSettings, UserSettingsInput } from '@/lib/supabase'
import ChipInput from './ChipInput'

const DIET_SUGGESTIONS = ['vegetarian', 'vegan', 'gluten_free', 'dairy_free']
const ALLERGEN_SUGGESTIONS = ['peanuts', 'tree_nuts', 'shellfish', 'dairy', 'eggs']
const CUISINE_SUGGESTIONS = [
  'Mediterranean',
  'Italian',
  'Mexican',
  'Asian',
  'American',
]
const EQUIPMENT_SUGGESTIONS = ['instant pot', 'air fryer', 'slow cooker']

function settingsToForm(s: UserSettings): UserSettingsInput {
  return {
    staple_ingredients: s.staple_ingredients ?? [],
    diets: s.diets ?? [],
    allergens_exclude: s.allergens_exclude ?? [],
    cuisines_prefer: s.cuisines_prefer ?? [],
    cuisines_avoid: s.cuisines_avoid ?? [],
    equipment: s.equipment ?? [],
    max_prep_minutes: s.max_prep_minutes,
    max_cook_minutes: s.max_cook_minutes,
    skill_level: s.skill_level,
    default_servings: s.default_servings,
  }
}

interface UserSettingsFormProps {
  initial: UserSettings
  onSaved: (settings: UserSettings) => void
}

export default function UserSettingsForm({
  initial,
  onSaved,
}: UserSettingsFormProps) {
  const [form, setForm] = useState<UserSettingsInput>(() =>
    settingsToForm(initial)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const update = <K extends keyof UserSettingsInput>(
    key: K,
    value: UserSettingsInput[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSuccess(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/user-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = (await res.json()) as UserSettings
      onSaved(data)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ChipInput
        label="Staple ingredients (always in your pantry)"
        values={form.staple_ingredients ?? []}
        onChange={(v) => update('staple_ingredients', v)}
        placeholder="e.g. olive oil, garlic"
        suggestions={['olive oil', 'garlic', 'onion', 'salt', 'pepper']}
        disabled={saving}
      />

      <ChipInput
        label="Diets"
        values={form.diets ?? []}
        onChange={(v) => update('diets', v)}
        suggestions={DIET_SUGGESTIONS}
        disabled={saving}
      />

      <ChipInput
        label="Allergens to exclude"
        values={form.allergens_exclude ?? []}
        onChange={(v) => update('allergens_exclude', v)}
        suggestions={ALLERGEN_SUGGESTIONS}
        disabled={saving}
      />

      <ChipInput
        label="Cuisines you prefer"
        values={form.cuisines_prefer ?? []}
        onChange={(v) => update('cuisines_prefer', v)}
        suggestions={CUISINE_SUGGESTIONS}
        disabled={saving}
      />

      <ChipInput
        label="Cuisines to avoid"
        values={form.cuisines_avoid ?? []}
        onChange={(v) => update('cuisines_avoid', v)}
        suggestions={CUISINE_SUGGESTIONS}
        disabled={saving}
      />

      <ChipInput
        label="Equipment you have"
        values={form.equipment ?? []}
        onChange={(v) => update('equipment', v)}
        suggestions={EQUIPMENT_SUGGESTIONS}
        disabled={saving}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max prep (minutes)
          </label>
          <input
            type="number"
            min={0}
            value={form.max_prep_minutes ?? ''}
            onChange={(e) =>
              update(
                'max_prep_minutes',
                e.target.value === '' ? null : Number(e.target.value)
              )
            }
            disabled={saving}
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-green"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max cook (minutes)
          </label>
          <input
            type="number"
            min={0}
            value={form.max_cook_minutes ?? ''}
            onChange={(e) =>
              update(
                'max_cook_minutes',
                e.target.value === '' ? null : Number(e.target.value)
              )
            }
            disabled={saving}
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-green"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Skill level
          </label>
          <select
            value={form.skill_level ?? ''}
            onChange={(e) =>
              update(
                'skill_level',
                (e.target.value || null) as SkillLevel | null
              )
            }
            disabled={saving}
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-green"
          >
            <option value="">Not set</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default servings
          </label>
          <input
            type="number"
            min={1}
            value={form.default_servings ?? 4}
            onChange={(e) =>
              update('default_servings', Math.max(1, Number(e.target.value) || 4))
            }
            disabled={saving}
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-green"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm">
          Settings saved.
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="bg-forest-green text-white px-8 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
      >
        {saving ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  )
}
