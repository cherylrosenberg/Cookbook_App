'use client'

interface SearchAndFiltersProps {
  allTags: string[]
  selectedTags: string[]
  onTagToggle: (tag: string) => void
}

export default function SearchAndFilters({
  allTags,
  selectedTags,
  onTagToggle,
}: SearchAndFiltersProps) {
  return (
    <div className="mb-8 md:mb-10">
      {/* Horizontal scrollable tags */}
      {allTags.length > 0 && (
        <div className="relative">
          <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth custom-scrollbar">
            {allTags.map((tag) => {
              const isSelected = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => onTagToggle(tag)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                    isSelected
                      ? 'bg-forest-green text-white border-forest-green shadow-sm'
                      : 'bg-white text-gray-800 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
