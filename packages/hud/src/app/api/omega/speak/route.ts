import { NextRequest, NextResponse } from 'next/server'

const GAING_BRAIN_URL = process.env.GAING_BRAIN_URL || 'http://localhost:8080'
const GAING_BRAIN_TIMEOUT_MS = Number(process.env.GAING_BRAIN_TIMEOUT_MS || 8000)

type SpeakRequest = {
  text?: string
  voice?: string
  [key: string]: any
}

export async function POST(request: NextRequest) {
  let timeoutId: NodeJS.Timeout | undefined

  try {
    // Parse and validate request body
    let body: SpeakRequest
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[HUD Speak] Failed to parse request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (body.text.length > 5000) {
      return NextResponse.json(
        { error: 'Text exceeds maximum length of 5000 characters' },
        { status: 413 }
      )
    }

    const controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), GAING_BRAIN_TIMEOUT_MS)

    try {
      const response = await fetch(`${GAING_BRAIN_URL}/omega/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      timeoutId = undefined

      if (!response.ok) {
        let errorText = 'Unknown error'
        try {
          errorText = await response.text()
        } catch (e) {
          console.error('[HUD Speak] Failed to read error response:', e)
        }

        console.error(`[HUD Speak] Brain returned ${response.status}: ${errorText.substring(0, 200)}`)
        return NextResponse.json(
          { error: `OMEGA speak service error: ${errorText.substring(0, 200)}` },
          { status: 502 }
        )
      }

      let data: any
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error('[HUD Speak] Failed to parse Brain response as JSON:', jsonError)
        return NextResponse.json(
          { error: 'Received invalid response from OMEGA speak service' },
          { status: 502 }
        )
      }

      return NextResponse.json(data)

    } catch (fetchError) {
      if (timeoutId) clearTimeout(timeoutId)

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error(`[HUD Speak] Request timeout after ${GAING_BRAIN_TIMEOUT_MS}ms`)
        return NextResponse.json(
          { error: `OMEGA speak request timed out after ${GAING_BRAIN_TIMEOUT_MS}ms` },
          { status: 504 }
        )
      }

      // Network errors
      if (fetchError instanceof TypeError && fetchError.message.includes('fetch failed')) {
        console.error('[HUD Speak] Network error connecting to Brain:', fetchError)
        return NextResponse.json(
          { error: 'Cannot connect to Brain service. Check if it is running.' },
          { status: 503 }
        )
      }

      throw fetchError
    }

  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId)

    console.error('[HUD Speak] Unexpected error:', error)
    return NextResponse.json(
      { error: 'OMEGA speak service temporarily unavailable' },
      { status: 500 }
    )
  }
}
