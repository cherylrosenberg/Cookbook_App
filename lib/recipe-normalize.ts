import {
  IngredientItem,
  IngredientSection,
  RawIngredients,
} from './supabase'

const OPTIONAL_INGREDIENTS_SECTION = 'Optional ingredients'

function isRawIngredients(value: object): value is RawIngredients {
  return 'sections' in value || 'optional' in value
}

export function isOptionalSectionName(name: string): boolean {
  const trimmed = name.trim()
  return (
    /^optional\b/i.test(trimmed) ||
    /\btoppings?\b/i.test(trimmed) ||
    /\bgarnish(es)?\b/i.test(trimmed) ||
    /^for\s+serving$/i.test(trimmed)
  )
}

function hasQuantity(item: IngredientItem): boolean {
  return Boolean(item.quantity?.trim())
}

/** Merge optional-named sections and trailing unquantified garnish items into one optional section. */
export function canonicalizeIngredientSections(
  sections: IngredientSection[]
): IngredientSection[] {
  const result: IngredientSection[] = []
  const optionalItems: IngredientItem[] = []

  for (const section of sections) {
    if (!section || typeof section !== 'object') {
      continue
    }

    const sectionName = section.section?.trim() || ''
    const items = Array.isArray(section.items) ? [...section.items] : []

    if (isOptionalSectionName(sectionName)) {
      optionalItems.push(...items)
      continue
    }

    const peeledOptional: IngredientItem[] = []
    while (items.length > 0) {
      const last = items[items.length - 1]
      if (hasQuantity(last)) {
        break
      }
      peeledOptional.unshift(items.pop()!)
    }

    optionalItems.push(...peeledOptional)

    if (items.length > 0) {
      result.push({
        section: sectionName || 'Ingredients',
        items,
      })
    }
  }

  if (optionalItems.length > 0) {
    result.push({
      section: OPTIONAL_INGREDIENTS_SECTION,
      items: optionalItems,
    })
  }

  return result
}

export function normalizeIngredients(input: unknown): IngredientSection[] {
  if (input == null) {
    return []
  }

  if (typeof input === 'string') {
    try {
      return normalizeIngredients(JSON.parse(input))
    } catch {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to parse ingredients JSON string')
      }
      return []
    }
  }

  if (Array.isArray(input)) {
    return canonicalizeIngredientSections(input as IngredientSection[])
  }

  if (typeof input === 'object') {
    if (isRawIngredients(input)) {
      const raw = input as RawIngredients
      const normalized: IngredientSection[] = []

      if (Array.isArray(raw.sections)) {
        normalized.push(...raw.sections)
      }

      if (Array.isArray(raw.optional) && raw.optional.length > 0) {
        normalized.push({
          section: OPTIONAL_INGREDIENTS_SECTION,
          items: raw.optional,
        })
      }

      return canonicalizeIngredientSections(
        normalized.length > 0 ? normalized : []
      )
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn('Unrecognized ingredients object shape', input)
    }
    return []
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn('Unrecognized ingredients input type', typeof input)
  }
  return []
}

export function normalizeRecipeIngredients<T extends { ingredients?: unknown }>(
  recipe: T
): T & { ingredients: IngredientSection[] } {
  return {
    ...recipe,
    ingredients: normalizeIngredients(recipe.ingredients),
  }
}
