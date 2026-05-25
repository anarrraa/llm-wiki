import { NextRequest, NextResponse } from 'next/server'

const S2_BASE = 'https://api.semanticscholar.org/graph/v1'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ error: 'Missing ?q=' }, { status: 400 })

  const year = searchParams.get('year') ?? ''
  const field = searchParams.get('field') ?? ''
  const minCitations = parseInt(searchParams.get('minCitations') ?? '0', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

  const params = new URLSearchParams({
    query: q,
    limit: String(limit),
    fields: 'title,authors,abstract,year,citationCount,externalIds,fieldsOfStudy',
  })
  if (year) params.set('year', year)
  if (field) params.set('fieldsOfStudy', field)

  const headers: Record<string, string> = {
    'User-Agent': 'llm-wiki/0.1 (research agent; mailto:anar@zerotech.mn)',
  }
  if (process.env.S2_API_KEY) headers['x-api-key'] = process.env.S2_API_KEY

  try {
    const res = await fetch(`${S2_BASE}/paper/search?${params.toString()}`, { headers })
    if (!res.ok) {
      const msg = res.status === 429 ? 'Semantic Scholar rate limit — try again shortly' : `S2 API error ${res.status}`
      return NextResponse.json({ error: msg }, { status: res.status === 429 ? 429 : 502 })
    }
    const data = await res.json()
    const papers = (data.data ?? [])
      .filter((p: Record<string, unknown>) => !minCitations || (p.citationCount as number) >= minCitations)
      .map((p: Record<string, unknown>) => ({
        id: (p.externalIds as Record<string, string>)?.ArXiv ?? (p.paperId as string),
        title: p.title,
        abstract: p.abstract ?? '',
        authors: ((p.authors as Array<{name: string}>) ?? []).map((a) => a.name),
        arxivId: (p.externalIds as Record<string, string>)?.ArXiv ?? '',
        arxivUrl: (p.externalIds as Record<string, string>)?.ArXiv
          ? `https://arxiv.org/abs/${(p.externalIds as Record<string, string>).ArXiv}`
          : '',
        category: ((p.fieldsOfStudy as string[]) ?? [])[0] ?? '',
        published: p.year ? `${p.year}-01-01` : '',
        citationCount: p.citationCount ?? 0,
        s2Id: p.paperId,
      }))
    return NextResponse.json({ papers })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
