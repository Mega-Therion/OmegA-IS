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
  try {
    const body = (await request.json()) as ChatRequest
    const { prompt, context, agent, useOmega } = parseBody(body)

    if (!prompt) {
      return respondWithError('Prompt is required to continue.', 400)
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return respondWithError('Prompt exceeds the allowed length.', 413)
    }

    const { signal, timeoutId } = createTimeoutSignal(GAING_BRAIN_TIMEOUT_MS)

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

    if (!response.ok) {
      const fallbackResponse = await fetch(`${GAING_BRAIN_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'jarvis-frontend',
          recipient: agent,
          content: prompt,
          message_type: 'text'
        })
      })

      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json()
        return NextResponse.json({
          reply: data.message?.content || 'Message logged. Processing...'
        })
      }

      return respondWithError('Upstream service unavailable. Try again shortly.', 502)
    }

    const data = await response.json()
    const reply =
      data.response?.choices?.[0]?.message?.content ||
      data.response?.content ||
      data.content ||
      data.reply ||
      'Neural link established. Awaiting further calibration.'

    return NextResponse.json({ reply })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return respondWithError('Upstream request timed out. Please retry.', 504)
    }
    console.error('JARVIS API Error:', error)
    return respondWithError(
      'Neural link temporarily interrupted. Falling back to local heuristics.',
      500
    )
  }
}
