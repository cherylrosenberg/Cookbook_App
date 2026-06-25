import { NextRequest, NextResponse } from 'next/server'
import { generateAndPersistRecipeImage } from '@/lib/recipe-image'
import { requireSupabaseEnv } from '@/lib/supabase-env'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const env = requireSupabaseEnv()
    if (!env.ok) return env.response

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      )
    }

    try {
      const imageUrl = await generateAndPersistRecipeImage(id, {
        throwOnError: true,
      })
      if (!imageUrl) {
        return NextResponse.json(
          { error: 'Failed to generate recipe image' },
          { status: 502 }
        )
      }
      return NextResponse.json({ image_url: imageUrl })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (
        msg.includes('503') ||
        msg.toLowerCase().includes('overloaded') ||
        msg.includes('RESOURCE_EXHAUSTED')
      ) {
        return NextResponse.json(
          {
            error:
              'Image service is busy. Please wait a moment and try again.',
          },
          { status: 503 }
        )
      }
      if (msg.includes('not found')) {
        return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
      }
      throw err
    }
  } catch (error) {
    console.error('Error generating recipe image:', error)
    return NextResponse.json(
      { error: 'Failed to generate recipe image' },
      { status: 500 }
    )
  }
}
