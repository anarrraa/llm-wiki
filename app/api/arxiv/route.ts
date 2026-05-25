import { NextRequest, NextResponse } from 'next/server'
import { fetchArxiv } from '@/lib/arxiv'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q?.trim()) {
    return NextResponse.json({ error: 'Missing query param ?q=' }, { status: 400 })
  }

  const max = parseInt(req.nextUrl.searchParams.get('max') ?? '20', 10)

  try {
    const papers = await fetchArxiv(q.trim(), Math.min(max, 50))
    return NextResponse.json({ papers })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'arXiv fetch failed'
    const status = msg.includes('rate limit') ? 429 : 502
    return NextResponse.json({ error: msg }, { status })
  }
}
