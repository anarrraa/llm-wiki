import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildSurveyPrompt, buildTemplateSurvey, SYSTEM_PROMPT } from '@/lib/latex'
import type { Paper } from '@/store/researchStore'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { topic, papers, mode }: { topic: string; papers: Paper[]; mode?: 'ai' | 'template' } =
    await req.json()

  if (!topic || !papers?.length) {
    return new Response(JSON.stringify({ error: 'topic and papers required' }), { status: 400 })
  }

  if (mode === 'template' || !process.env.ANTHROPIC_API_KEY) {
    const latex = buildTemplateSurvey(topic, papers)
    return new Response(latex, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  const prompt = buildSurveyPrompt(topic, papers)

  // Start stream immediately — do NOT await finalMessage() before piping,
  // that would block until the full response is received and defeat streaming.
  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        const isCredits = msg.includes('credit balance') || msg.includes('insufficient')
        if (isCredits) {
          const latex = buildTemplateSurvey(topic, papers)
          controller.enqueue(encoder.encode(latex))
        }
        // For other errors, close cleanly — client sees partial content or empty
      } finally {
        controller.close()
      }
    },
    cancel() {
      stream.abort()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Accel-Buffering': 'no',
    },
  })
}
