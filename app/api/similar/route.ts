import { NextRequest, NextResponse } from 'next/server'

const S2_BASE = 'https://api.semanticscholar.org/graph/v1'
const S2_REC = 'https://api.semanticscholar.org/recommendations/v1/papers'

async function arxivToS2(arxivId: string, headers: Record<string, string>): Promise<string | null> {
  const res = await fetch(`${S2_BASE}/paper/arXiv:${arxivId}?fields=paperId`, { headers })
  if (!res.ok) return null
  const data = await res.json()
  return data.paperId ?? null
}

function mapPaper(p: Record<string, unknown>) {
  const ext = (p.externalIds as Record<string, string>) ?? {}
  const arxivId = ext.ArXiv ?? ''
  return {
    id: arxivId || (p.paperId as string),
    title: p.title ?? '',
    abstract: (p.abstract as string) ?? '',
    authors: ((p.authors as Array<{ name: string }>) ?? []).map((a) => a.name),
    arxivId,
    arxivUrl: arxivId ? `https://arxiv.org/abs/${arxivId}` : '',
    category: '',
    published: p.year ? `${p.year}-01-01` : '',
    citationCount: (p.citationCount as number) ?? 0,
  }
}

export async function GET(req: NextRequest) {
  const arxivId = req.nextUrl.searchParams.get('arxivId')?.trim()
  if (!arxivId) return NextResponse.json({ error: 'Missing ?arxivId=' }, { status: 400 })

  const apiKey = process.env.S2_API_KEY
  const headers: Record<string, string> = { 'User-Agent': 'llm-wiki/0.1' }
  if (apiKey) headers['x-api-key'] = apiKey

  const s2Id = await arxivToS2(arxivId, headers)
  if (!s2Id) return NextResponse.json({ papers: [] })

  // Use the POST bulk endpoint — the single-paper GET endpoint returns empty results
  const res = await fetch(`${S2_REC}/?fields=title,authors,abstract,year,externalIds,citationCount&limit=8`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ positivePaperIds: [s2Id], negativePaperIds: [] }),
  })

  if (!res.ok) return NextResponse.json({ papers: [] })

  const data = await res.json()
  const papers = ((data.recommendedPapers ?? []) as Array<Record<string, unknown>>).map(mapPaper)

  return NextResponse.json({ papers })
}
