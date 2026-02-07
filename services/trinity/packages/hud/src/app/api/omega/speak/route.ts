import { NextRequest, NextResponse } from 'next/server'

const GAING_BRAIN_URL = process.env.GAING_BRAIN_URL || 'http://localhost:8080'
const GAING_BRAIN_TIMEOUT_MS = Number(process.env.GAING_BRAIN_TIMEOUT_MS || 8000)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GAING_BRAIN_TIMEOUT_MS)

    const response = await fetch(`${GAING_BRAIN_URL}/omega/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: errorText || 'omega speak failed' }, { status: 502 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'omega speak timeout' }, { status: 504 })
    }
    console.error('OMEGA Speak API Error:', error)
    return NextResponse.json({ error: 'omega speak failed' }, { status: 500 })
  }
}
