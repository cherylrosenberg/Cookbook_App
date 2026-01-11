'use client'

import { useState, useMemo } from 'react'
import { X, Tag, Search } from 'lucide-react'

interface TagSidebarProps {
  allTags: string[]
  selectedTags: string[]
  onTagToggle: (tag: string) => void
}

export default function TagSidebar({
  allTags,
  selectedTags,
  onTagToggle,
}: TagSidebarProps) {
  const [tagSearchQuery, setTagSearchQuery] = useState('')

  const filteredTags = useMemo(() => {
    if (!tagSearchQuery.trim()) {
      return allTags
    }
    const query = tagSearchQuery.toLowerCase()
    return allTags.filter((tag) => tag.toLowerCase().includes(query))
  }, [allTags, tagSearchQuery])

  if (allTags.length === 0) {
    return null
  }

  return (
    <div className="bg-gray-50 rounded-xl shadow-lg border border-gray-200 p-5 md:p-6 sticky top-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-300">
        <div className="p-2 bg-light-green rounded-lg">
          <Tag className="w-4 h-4 text-forest-green" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Filter by Tags</h2>
        {selectedTags.length > 0 && (
          <span className="ml-auto bg-forest-green text-white text-xs font-semibold px-2 py-1 rounded-full">
            {selectedTags.length}
          </span>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={tagSearchQuery}
          onChange={(e) => setTagSearchQuery(e.target.value)}
          placeholder="Search tags..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-green focus:border-transparent bg-white text-sm"
        />
      </div>

      {/* Tags List */}
      <div className="flex flex-col gap-2 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1 custom-scrollbar">
        {filteredTags.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No tags found
          </div>
        ) : (
          filteredTags.map((tag) => {
            const isSelected = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => onTagToggle(tag)}
                className={`group relative px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left ${
                  isSelected
                    ? 'bg-forest-green text-white shadow-md transform scale-[1.02]'
                    : 'bg-white text-gray-700 hover:bg-light-green hover:text-forest-green hover:shadow-sm border border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center justify-between">
                  <span>{tag}</span>
                  {isSelected && (
                    <X className="w-3.5 h-3.5 ml-2 opacity-80 group-hover:opacity-100" />
                  )}
                </span>
              </button>
            )
          })
        )}
      </div>

      {/* Clear Filters Button */}
      {selectedTags.length > 0 && (
        <div className="mt-5 pt-4 border-t border-gray-300">
          <button
            onClick={() => {
              selectedTags.forEach((tag) => onTagToggle(tag))
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-forest-green hover:bg-light-green rounded-lg transition-all duration-200 group"
          >
            <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
            <span>Clear all filters</span>
          </button>
        </div>
      )}
    </div>
  )
}

