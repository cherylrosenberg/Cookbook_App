import { Recipe } from './supabase'

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

export function getEmojiForRecipe(
  recipe: Pick<Recipe, 'title' | 'tags'>
): string {
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

export function getGradientClassForRecipe(recipe: Pick<Recipe, 'id'>): string {
  const index = hashId(recipe.id) % PLACEHOLDER_GRADIENTS.length
  return PLACEHOLDER_GRADIENTS[index]
}
