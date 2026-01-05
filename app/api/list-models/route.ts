import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not set' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Try to list available models using the REST API directly
    // The SDK might not have listModels, so we'll call the API directly
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + apiKey)
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    const models = (data.models || []).map((model: any) => {
      // Extract just the model name from the full path (e.g., "models/gemini-3-flash-preview" -> "gemini-3-flash-preview")
      const name = model.name.replace('models/', '')
      return {
        name,
        fullName: model.name,
        displayName: model.displayName || name,
        supportedMethods: model.supportedGenerationMethods || [],
        description: model.description || ''
      }
    })

    return NextResponse.json({
      models: models,
      count: models.length
    })
  } catch (error) {
    console.error('Error listing models:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to list models',
        hint: 'Make sure your GEMINI_API_KEY is valid and has access to the models API'
      },
      { status: 500 }
    )
  }
}

