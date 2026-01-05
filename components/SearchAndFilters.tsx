'use client'

import { Search } from 'lucide-react'

interface SearchAndFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  allTags: string[]
  selectedTags: string[]
  onTagToggle: (tag: string) => void
}

export default function SearchAndFilters({
  searchQuery,
  onSearchChange,
  allTags,
  selectedTags,
  onTagToggle,
}: SearchAndFiltersProps) {
  return (
    <div className="mb-6 md:mb-8">
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search recipes by title or tags..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-green bg-white"
        />
      </div>

      {/* Tag Filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => {
            const isSelected = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => onTagToggle(tag)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-forest-green text-white'
                    : 'bg-light-green text-forest-green hover:bg-green-100'
                }`}
              >
                {tag}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

