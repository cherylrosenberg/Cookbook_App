/**
 * Parses and scales recipe quantities
 * Handles formats like "3 tablespoons", "1/2 cup", "2 large", "¾ teaspoon"
 */

interface ParsedQuantity {
  value: number
  unit: string
  descriptor: string
}

/**
 * Converts fraction strings to numbers
 */
function parseFraction(fraction: string): number {
  const fractionMap: Record<string, number> = {
    '¼': 0.25,
    '½': 0.5,
    '¾': 0.75,
    '⅓': 1 / 3,
    '⅔': 2 / 3,
    '⅛': 0.125,
    '⅜': 0.375,
    '⅝': 0.625,
    '⅞': 0.875,
  }

  if (fractionMap[fraction]) {
    return fractionMap[fraction]
  }

  // Handle "1/2" format
  const match = fraction.match(/(\d+)\/(\d+)/)
  if (match) {
    return parseInt(match[1]) / parseInt(match[2])
  }

  return parseFloat(fraction) || 0
}

/**
 * Parses a quantity string into numeric value, unit, and descriptor
 */
export function parseQuantity(quantity: string): ParsedQuantity {
  const trimmed = quantity.trim()
  
  // Handle empty or non-numeric strings
  if (!trimmed || trimmed === 'to taste' || trimmed === 'as needed') {
    return { value: 0, unit: '', descriptor: trimmed }
  }

  // Extract numeric value (handles fractions, decimals, and whole numbers)
  const numberPattern = /([¼½¾⅓⅔⅛⅜⅝⅞]|\d+\/\d+|\d+\.?\d*)/u
  const numberMatch = trimmed.match(numberPattern)
  
  if (!numberMatch) {
    return { value: 0, unit: '', descriptor: trimmed }
  }

  const numericValue = parseFraction(numberMatch[1])
  
  // Extract unit (common cooking units)
  const unitPattern = /\b(teaspoon|tablespoon|cup|cups|pound|pounds|oz|ounce|ounces|gram|grams|kg|kilogram|ml|milliliter|liter|litre|clove|cloves|can|cans|package|packages|bunch|bunches|head|heads|piece|pieces|slice|slices|dash|pinch|sprig|sprigs)\b/i
  const unitMatch = trimmed.match(unitPattern)
  const unit = unitMatch ? unitMatch[1].toLowerCase() : ''

  // Extract descriptor (e.g., "large", "medium", "small")
  const descriptorPattern = /\b(large|medium|small|extra large|xl|fresh|dried|chopped|sliced|minced|whole|halved|quartered)\b/i
  const descriptorMatch = trimmed.match(descriptorPattern)
  const descriptor = descriptorMatch ? descriptorMatch[1].toLowerCase() : ''

  return {
    value: numericValue,
    unit,
    descriptor,
  }
}

/**
 * Scales a quantity string by a multiplier
 */
export function scaleQuantity(quantity: string, multiplier: number): string {
  if (multiplier === 1) {
    return quantity
  }

  const parsed = parseQuantity(quantity)
  
  // If no numeric value, return original
  if (parsed.value === 0 && !quantity.match(/\d/)) {
    return quantity
  }

  const scaledValue = parsed.value * multiplier
  
  // Format the scaled value
  let formattedValue: string
  
  if (scaledValue % 1 === 0) {
    // Whole number
    formattedValue = scaledValue.toString()
  } else {
    // Decimal - format to 2 decimal places and remove trailing zeros
    formattedValue = scaledValue.toFixed(2).replace(/\.?0+$/, '')
    
    // Convert common decimals to fractions for readability
    const fractionMap: Record<string, string> = {
      '0.25': '¼',
      '0.5': '½',
      '0.75': '¾',
      '0.33': '⅓',
      '0.67': '⅔',
    }
    
    if (fractionMap[formattedValue]) {
      formattedValue = fractionMap[formattedValue]
    }
  }

  // Reconstruct the quantity string
  const parts: string[] = [formattedValue]
  
  if (parsed.unit) {
    parts.push(parsed.unit)
  }
  
  if (parsed.descriptor) {
    parts.push(parsed.descriptor)
  }

  return parts.join(' ')
}

/**
 * Parses a time string (e.g., "15 minutes", "1 hour", "1 hour 30 minutes") into total minutes
 */
function parseTimeToMinutes(timeStr: string | null | undefined): number {
  if (!timeStr) return 0
  
  const trimmed = timeStr.trim().toLowerCase()
  let totalMinutes = 0
  
  // Extract hours
  const hourMatch = trimmed.match(/(\d+)\s*(?:hour|hr|h)\s*/i)
  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1]) * 60
  }
  
  // Extract minutes
  const minuteMatch = trimmed.match(/(\d+)\s*(?:minute|min|m)\s*/i)
  if (minuteMatch) {
    totalMinutes += parseInt(minuteMatch[1])
  }
  
  // If no hours or minutes found, try to extract just a number (assume minutes)
  if (totalMinutes === 0) {
    const numberMatch = trimmed.match(/(\d+)/)
    if (numberMatch) {
      totalMinutes = parseInt(numberMatch[1])
    }
  }
  
  return totalMinutes
}

/**
 * Formats minutes into a readable time string (e.g., "1 hour 30 minutes", "45 minutes")
 */
function formatMinutesToTime(minutes: number): string {
  if (minutes === 0) return ''
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  const parts: string[] = []
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`)
  }
  if (mins > 0) {
    parts.push(`${mins} ${mins === 1 ? 'minute' : 'minutes'}`)
  }
  
  return parts.join(' ')
}

/**
 * Calculates total_time from prep_time and cook_time if total_time is not provided
 */
export function calculateTotalTime(
  prepTime: string | null | undefined,
  cookTime: string | null | undefined,
  totalTime: string | null | undefined
): string | null {
  // If total_time is already provided, return it
  if (totalTime && totalTime.trim()) {
    return totalTime
  }
  
  // Calculate from prep_time + cook_time
  const prepMinutes = parseTimeToMinutes(prepTime)
  const cookMinutes = parseTimeToMinutes(cookTime)
  const totalMinutes = prepMinutes + cookMinutes
  
  if (totalMinutes === 0) {
    return null
  }
  
  return formatMinutesToTime(totalMinutes)
}

