'use client'

import { Recipe } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Clock, Users, Trash2 } from 'lucide-react'
import { calculateTotalTime } from '@/lib/quantity-parser'

interface RecipeCardProps {
  recipe: Recipe
  onDelete: (id: string) => void
}

const PLACEHOLDER_GRADIENTS = [
  'bg-placeholder-1',
  'bg-placeholder-2',
  'bg-placeholder-3',
  'bg-placeholder-4',
  'bg-placeholder-5',
  'bg-placeholder-6',
] as const

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function getEmojiForRecipe(recipe: Recipe): string {
  const text = `${recipe.title} ${(recipe.tags || []).join(' ')}`.toLowerCase()
  const map: [RegExp, string][] = [
    [/pasta|noodle|spaghetti|lasagna/, '🍝'],
    [/chicken|poultry/, '🍗'],
    [/beef|steak|burger/, '🥩'],
    [/soup|broth/, '🍲'],
    [/salad/, '🥗'],
    [/cake|cupcake/, '🍰'],
    [/cookie|brownie/, '🍪'],
    [/bread|roll|bagel/, '🍞'],
    [/fish|salmon|tuna|seafood/, '🐟'],
    [/dessert|ice cream|pudding/, '🍨'],
    [/breakfast|pancake|waffle|egg/, '🥞'],
    [/pizza/, '🍕'],
    [/taco|burrito|mexican/, '🌮'],
    [/sushi|rice/, '🍣'],
    [/curry|indian|thai/, '🍛'],
    [/apple|pie|fruit/, '🥧'],
    [/coffee|tea/, '☕'],
    [/smoothie|juice/, '🥤'],
  ]
  for (const [re, emoji] of map) {
    if (re.test(text)) return emoji
  }
  return '🍽️'
}

function getGradientClassForRecipe(recipe: Recipe): string {
  const index = hashId(recipe.id) % PLACEHOLDER_GRADIENTS.length
  return PLACEHOLDER_GRADIENTS[index]
}

export default function RecipeCard({ recipe, onDelete }: RecipeCardProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/recipe/${recipe.id}`)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(recipe.id)
  }

  const displayTags = recipe.tags.slice(0, 3)
  const remainingTags = recipe.tags.length - 3

  const totalTime = calculateTotalTime(
    recipe.prep_time,
    recipe.cook_time,
    recipe.total_time
  )

  const emoji = getEmojiForRecipe(recipe)
  const gradientClass = getGradientClassForRecipe(recipe)

  return (
    <div
      onClick={handleClick}
      className="group bg-white rounded-xl shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col h-full overflow-hidden"
    >
      {/* Image placeholder with emoji and gradient */}
      <div
        className={`${gradientClass} h-28 flex items-center justify-center shrink-0`}
      >
        <span className="text-5xl" role="img" aria-hidden>
          {emoji}
        </span>
      </div>

      <div className="p-5 md:p-6 flex-1 flex flex-col">
        <h3 className="font-bold text-gray-800 text-xl mb-3 line-clamp-2 min-h-[2.75rem]">
          {recipe.title}
        </h3>

        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
          {totalTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{totalTime}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{recipe.servings}</span>
          </div>
        </div>

        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-auto">
            {displayTags.map((tag, index) => (
              <span
                key={index}
                className="bg-light-green text-forest-green text-xs px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
            {remainingTags > 0 && (
              <span className="bg-light-green text-forest-green text-xs px-2 py-1 rounded-full">
                +{remainingTags}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
        <button
          onClick={handleDelete}
          className="text-gray-500 hover:text-gray-700 p-2 rounded transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
          aria-label="Delete recipe"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
