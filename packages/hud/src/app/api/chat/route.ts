import { NextRequest, NextResponse } from 'next/server'

const GAING_BRAIN_URL = process.env.GAING_BRAIN_URL || 'http://localhost:8080'
const GAING_BRAIN_TIMEOUT_MS = Number(process.env.GAING_BRAIN_TIMEOUT_MS || 8000)
const MAX_PROMPT_LENGTH = 2000
const MAX_CONTEXT_ITEMS = 6
const MAX_CONTEXT_CHARS = 600
const ALLOWED_AGENTS = new Set(['gemini', 'claude', 'codex', 'grok'])

type ChatRequest = {
  prompt?: string
  context?: string[]
  agent?: string
  useOmega?: boolean
}

const createTimeoutSignal = (timeoutMs: number) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  return { signal: controller.signal, timeoutId }
}

const parseBody = (body: ChatRequest) => {
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  const agent = typeof body.agent === 'string' && ALLOWED_AGENTS.has(body.agent) ? body.agent : 'gemini'
  const context = Array.isArray(body.context)
    ? body.context
        .filter((item) => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.slice(0, MAX_CONTEXT_CHARS))
        .slice(0, MAX_CONTEXT_ITEMS)
    : []

  const useOmega = Boolean(body.useOmega)

  return { prompt, context, agent, useOmega }
}

const respondWithError = (message: string, status: number) => {
  return NextResponse.json(
    {
      reply: message,
      error: true
    },
    { status }
  )
}

const buildOmegaMessages = (prompt: string, context: string[]) => {
  const messages = [] as { role: string; content: string }[]

  if (context.length) {
    messages.push({
      role: 'system',
      content: `Grounded context:\n${context.join('\n')}`
    })
  }

  messages.push({ role: 'user', content: prompt })
  return messages
}

export async function POST(request: NextRequest) {
  let timeoutId: NodeJS.Timeout | undefined

  try {
    // Parse and validate request body
    let body: ChatRequest
    try {
      body = (await request.json()) as ChatRequest
    } catch (parseError) {
      console.error('[HUD Chat] Failed to parse request body:', parseError)
      return respondWithError('Invalid JSON in request body.', 400)
    }

    const { prompt, context, agent, useOmega } = parseBody(body)

    if (!prompt) {
      return respondWithError('Prompt is required to continue.', 400)
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return respondWithError('Prompt exceeds the allowed length.', 413)
    }

    const { signal, timeoutId: tid } = createTimeoutSignal(GAING_BRAIN_TIMEOUT_MS)
    timeoutId = tid

    try {
      const response = await fetch(
        `${GAING_BRAIN_URL}${useOmega ? '/omega/chat' : '/api/llm/chat'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            useOmega
              ? {
                  messages: buildOmegaMessages(prompt, context),
                  max_tokens: 500,
                  temperature: 0.7
                }
              : {
                  messages: [
                    {
                      role: 'system',
                      content: `You are JARVIS, an advanced AI assistant with neural-link capabilities. You have access to retrieval-augmented context when available. Be concise, helpful, and precise.${
                        context.length ? `\n\nGrounded context:\n${context.join('\n')}` : ''
                      }`
                    },
                    { role: 'user', content: prompt }
                  ],
                  max_tokens: 500,
                  temperature: 0.7,
                  model: agent
                }
          ),
          signal
        }
      )

      clearTimeout(timeoutId)
      timeoutId = undefined

      if (!response.ok) {
        console.warn(`[HUD Chat] Primary endpoint failed with ${response.status}, trying fallback...`)

        // Try fallback endpoint
        try {
          const fallbackResponse = await fetch(`${GAING_BRAIN_URL}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sender: 'jarvis-frontend',
              recipient: agent,
              content: prompt,
              message_type: 'text'
            }),
            signal: createTimeoutSignal(GAING_BRAIN_TIMEOUT_MS).signal
          })

          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json()
            return NextResponse.json({
              reply: data.message?.content || 'Message logged. Processing...'
            })
          }

          console.error(`[HUD Chat] Fallback endpoint also failed with ${fallbackResponse.status}`)
        } catch (fallbackError) {
          console.error('[HUD Chat] Fallback endpoint error:', fallbackError)
        }

        return respondWithError('Upstream service unavailable. Try again shortly.', 502)
      }

      // Parse response
      let data: any
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error('[HUD Chat] Failed to parse Brain response as JSON:', jsonError)
        return respondWithError('Received invalid response from upstream service.', 502)
      }

      const reply =
        data.response?.choices?.[0]?.message?.content ||
        data.response?.content ||
        data.content ||
        data.reply ||
        'Neural link established. Awaiting further calibration.'

      return NextResponse.json({ reply })

    } catch (fetchError) {
      if (timeoutId) clearTimeout(timeoutId)

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error(`[HUD Chat] Request timeout after ${GAING_BRAIN_TIMEOUT_MS}ms`)
        return respondWithError('Upstream request timed out. Please retry.', 504)
      }

      // Check for network errors
      if (fetchError instanceof TypeError && fetchError.message.includes('fetch failed')) {
        console.error('[HUD Chat] Network error connecting to Brain:', fetchError)
        return respondWithError('Cannot connect to Brain service. Check if it is running.', 503)
      }

      throw fetchError
    }

  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId)

    console.error('[HUD Chat] Unexpected error:', error)
    return respondWithError(
      'Neural link temporarily interrupted. Falling back to local heuristics.',
      500
    )
  }
}
