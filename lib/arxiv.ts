import { XMLParser } from 'fast-xml-parser'
import type { Paper } from '@/store/researchStore'

const ARXIV_API = 'https://export.arxiv.org/api/query'

interface AtomEntry {
  id: string
  title: string | { '#text': string }
  summary: string
  author: { name: string } | Array<{ name: string }>
  published: string
  'arxiv:primary_category'?: { '@_term': string }
  category?: { '@_term': string } | Array<{ '@_term': string }>
  link: { '@_href': string } | Array<{ '@_href': string }>
}

function extractId(idUrl: string): string {
  const parts = idUrl.trim().split('/')
  const raw = parts[parts.length - 1] ?? ''
  return raw.replace(/v\d+$/, '')
}

function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return []
  return Array.isArray(val) ? val : [val]
}

function absLink(links: AtomEntry['link']): string {
  const all = toArray(links as { '@_href': string } | Array<{ '@_href': string }>)
  const abs = all.find((l) => !l['@_href']?.includes('pdf'))
  return abs?.['@_href'] ?? (all[0]?.['@_href'] ?? '')
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function fetchArxiv(query: string, maxResults = 25): Promise<Paper[]> {
  const params = new URLSearchParams({
    search_query: `all:${query}`,
    start: '0',
    max_results: String(maxResults),
    sortBy: 'lastUpdatedDate',
    sortOrder: 'descending',
  })

  const url = `${ARXIV_API}?${params.toString()}`
  let res: Response | null = null

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await delay(3000 * attempt)
    res = await fetch(url, {
      headers: { 'User-Agent': 'llm-wiki/0.1 (research agent; mailto:anar@zerotech.mn)' },
      next: { revalidate: 300 },
    })
    if (res.status !== 429) break
  }

  if (!res || !res.ok) {
    const status = res?.status ?? 0
    const msg = status === 429
      ? 'arXiv rate limit — wait a few seconds and try again'
      : `arXiv API error ${status}`
    throw new Error(msg)
  }

  const xml = await res.text()
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const feed = parser.parse(xml)

  const entries: AtomEntry[] = toArray(feed?.feed?.entry)

  return entries.map((e) => {
    const cats = toArray(e.category as { '@_term': string } | Array<{ '@_term': string }>)
    const primary =
      (e['arxiv:primary_category'] as { '@_term': string } | undefined)?.['@_term'] ??
      cats[0]?.['@_term'] ??
      ''

    const authors = toArray(e.author as { name: string } | Array<{ name: string }>)
      .map((a) => a.name)
      .filter(Boolean)

    const titleVal = e.title
    const title = typeof titleVal === 'object' && '#text' in titleVal
      ? (titleVal as { '#text': string })['#text']
      : String(titleVal ?? '')

    const idUrl = String(e.id ?? '')
    const arxivId = extractId(idUrl)

    return {
      id: arxivId || idUrl,
      title: title.replace(/\s+/g, ' ').trim(),
      abstract: String(e.summary ?? '').replace(/\s+/g, ' ').trim(),
      authors,
      arxivUrl: absLink(e.link) || idUrl,
      arxivId,
      category: primary,
      published: String(e.published ?? ''),
    } satisfies Paper
  })
}
