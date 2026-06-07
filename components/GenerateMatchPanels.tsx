'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  GenerateRecipeMeta,
  PersonalRecipeMatch,
  RecipeChunkMatch,
} from '@/lib/supabase'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface GenerateMatchPanelsProps {
  corpusMatches: RecipeChunkMatch[]
  personalMatches: PersonalRecipeMatch[]
  meta: GenerateRecipeMeta
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-left font-medium text-gray-800"
      >
        {title}
        {open ? (
          <ChevronDown className="w-5 h-5" />
        ) : (
          <ChevronRight className="w-5 h-5" />
        )}
      </button>
      {open && <div className="px-4 py-3 bg-white">{children}</div>}
    </div>
  )
}

export default function GenerateMatchPanels({
  corpusMatches,
  personalMatches,
  meta,
}: GenerateMatchPanelsProps) {
  return (
    <div className="mb-6">
      {meta.corpus_warning && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm">
          {meta.corpus_warning}
        </div>
      )}

      <CollapsibleSection
        title={`Corpus inspiration (${corpusMatches.length})`}
        defaultOpen={corpusMatches.length > 0 && corpusMatches.length <= 3}
      >
        {corpusMatches.length === 0 ? (
          <p className="text-gray-600 text-sm">No corpus matches for this query.</p>
        ) : (
          <ul className="space-y-3">
            {corpusMatches.map((m) => (
              <li key={m.id} className="text-sm">
                <p className="font-medium text-gray-800">
                  {Math.round(m.similarity * 100)}% — {m.title}
                </p>
                <p className="text-gray-600 mt-1 line-clamp-3">
                  {m.content.slice(0, 300)}
                  {m.content.length > 300 ? '…' : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection title={`Your cookbook (${personalMatches.length})`}>
        {personalMatches.length === 0 ? (
          <p className="text-gray-600 text-sm">
            No saved recipes overlap your key ingredients.
          </p>
        ) : (
          <ul className="space-y-2">
            {personalMatches.map((m) => (
              <li key={m.id} className="text-sm">
                <Link
                  href={`/recipe/${m.id}`}
                  className="text-forest-green hover:underline font-medium"
                >
                  {m.title}
                </Link>
                <span className="text-gray-600">
                  {' '}
                  — {m.overlap_count} ingredient overlap
                </span>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>
    </div>
  )
}
