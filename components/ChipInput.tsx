'use client'

import { KeyboardEvent, useState } from 'react'
import { X } from 'lucide-react'

interface ChipInputProps {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  suggestions?: string[]
  disabled?: boolean
}

export default function ChipInput({
  label,
  values,
  onChange,
  placeholder = 'Type and press Enter',
  suggestions = [],
  disabled = false,
}: ChipInputProps) {
  const [draft, setDraft] = useState('')

  const addValue = (raw: string) => {
    const v = raw.trim()
    if (!v) return
    const lower = v.toLowerCase()
    if (values.some((x) => x.toLowerCase() === lower)) return
    onChange([...values, v])
    setDraft('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addValue(draft)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-800 text-sm px-3 py-1 rounded-full"
          >
            {v}
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="text-gray-500 hover:text-gray-800"
                aria-label={`Remove ${v}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </span>
        ))}
      </div>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => addValue(draft)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-green disabled:opacity-50"
      />
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => addValue(s)}
              className="text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
