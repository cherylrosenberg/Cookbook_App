import { NextRequest, NextResponse } from 'next/server'
import { extractRecipeFromText, extractRecipeFromUrl } from '@/lib/gemini'

// Verify environment variables are set
if (!process.env.GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY is not set in environment variables')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, content } = body

    if (!type || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: type and content' },
        { status: 400 }
      )
    }

    if (type !== 'url' && type !== 'text') {
      return NextResponse.json(
        { error: 'Type must be either "url" or "text"' },
        { status: 400 }
      )
    }

    let recipe
    if (type === 'url') {
      recipe = await extractRecipeFromUrl(content)
    } else {
      recipe = await extractRecipeFromText(content)
    }

    return NextResponse.json(recipe)
  } catch (error) {
    console.error('Error extracting recipe:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract recipe' },
      { status: 500 }
    )
  }
}

