/**
 * Smoke tests for unified ingredient parsing.
 * npm run test:ingredient-match
 */
import {
  formatIngredientForGapDisplay,
  ingredientMatchesPantryList,
  isAssumedOnHandIngredient,
  parseIngredientLine,
} from '../lib/ingredient-normalize'
import { computePantryGaps } from '../lib/pantry-gap'
import type { RecipeInput } from '../lib/supabase'

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('OK:', msg)
}

function testPrimary(input: string, expected: string) {
  const { primary } = parseIngredientLine(input)
  assert(primary === expected, `primary("${input}") = ${primary}, want ${expected}`)
}

function testMatch(recipe: string, pantry: string[], should: boolean) {
  const got = ingredientMatchesPantryList(recipe, pantry)
  assert(
    got === should,
    `match("${recipe}", [${pantry.join(', ')}]) = ${got}, want ${should}`
  )
}

function main() {
  testPrimary('kosher salt', 'salt')
  testPrimary('garlic, minced', 'garlic')
  testPrimary('ground black pepper', 'black_pepper')
  testPrimary('bell pepper', 'bell_pepper')
  testPrimary('peppers', 'bell_pepper')
  testPrimary('pepper', 'pepper')
  testPrimary('warm water', 'water')

  testMatch('kosher salt', ['salt'], true)
  testMatch('garlic, minced', ['garlic'], true)
  testMatch('ground black pepper', ['black pepper'], true)
  testMatch('ground black pepper', ['pepper'], true)
  testMatch('cracked black pepper', ['pepper'], true)
  testMatch('bell pepper', ['black pepper'], false)
  testMatch('bell pepper', ['pepper'], false)
  testMatch('bell peppers (red and yellow), cut into 1-inch pieces', ['peppers'], true)
  testMatch('bell pepper', ['peppers'], true)
  testMatch('pepper', ['peppers'], false)
  testMatch('pepper', ['pepper'], true)

  const recipe: RecipeInput = {
    title: 'Test',
    servings: 4,
    prep_time: '',
    cook_time: '',
    total_time: '',
    ingredients: [
      {
        section: 'Main',
        items: [{ ingredient: 'coconut milk', quantity: '1 can' }],
      },
    ],
    instructions: ['Mix'],
    tags: [],
  }
  const gaps = computePantryGaps(recipe, ['garlic', 'salt'], [])
  assert(
    gaps.not_on_staples.length === 1 && gaps.not_on_staples[0] === 'coconut milk',
    'pantry gap lists only coconut milk'
  )

  const gaps2 = computePantryGaps(recipe, ['garlic', 'salt'], ['coconut milk'])
  assert(gaps2.not_on_staples.length === 0, 'key ingredient covers coconut milk')

  const gapsWater = computePantryGaps(
    {
      ...recipe,
      ingredients: [
        {
          section: 'Main',
          items: [{ ingredient: 'warm water', quantity: '1 cup' }],
        },
      ],
    },
    ['garlic'],
    []
  )
  assert(gapsWater.not_on_staples.length === 0, 'warm water assumed on hand')
  assert(isAssumedOnHandIngredient('warm water'), 'isAssumedOnHand warm water')

  const gapsPeppers = computePantryGaps(
    {
      ...recipe,
      ingredients: [
        {
          section: 'Main',
          items: [
            {
              ingredient:
                'bell peppers (red and yellow), cut into 1-inch pieces',
              quantity: '2',
            },
          ],
        },
      ],
    },
    ['garlic', 'salt'],
    ['peppers']
  )
  assert(gapsPeppers.not_on_staples.length === 0, 'key peppers covers bell peppers')

  const gapsBlackPepper = computePantryGaps(
    {
      ...recipe,
      ingredients: [
        {
          section: 'Main',
          items: [{ ingredient: 'cracked black pepper', quantity: '1/4 tsp' }],
        },
      ],
    },
    ['pepper', 'salt'],
    []
  )
  assert(
    gapsBlackPepper.not_on_staples.length === 0,
    'staple pepper covers cracked black pepper'
  )

  const display = formatIngredientForGapDisplay(
    'bell peppers (red and yellow), cut into 1-inch pieces'
  )
  assert(
    display === 'bell peppers' && !display.includes('cut into'),
    'gap display strips prep and parentheticals'
  )

  console.log('\nAll ingredient match tests passed.')
}

main()
