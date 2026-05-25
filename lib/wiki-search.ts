import matter from 'gray-matter'
import fs from 'fs'
import path from 'path'

export interface WikiResult {
  slug: string
  title: string
  arxivId: string
  score?: number
}

type AnyIndex = {
  add(doc: Record<string, string>): void
  search(query: string, options: Record<string, unknown>): Array<{ result: Array<{ id: string; doc: WikiResult }> }>
}

let index: AnyIndex | null = null

function buildIndex(): AnyIndex {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FlexSearch = require('flexsearch')
  const DocClass = FlexSearch.Document ?? FlexSearch.default?.Document
  const dir = path.join(process.cwd(), 'wiki', 'papers')
  const idx = new DocClass({
    document: { id: 'slug', index: ['title', 'arxivId'], store: true },
    tokenize: 'forward',
  })
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir).filter((f: string) => f.endsWith('.md'))) {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8')
      const { data } = matter(raw)
      const slug = file.replace(/\.md$/, '')
      idx.add({ slug, title: data.title ?? slug, arxivId: data.arxivId ?? '' })
    }
  }
  return idx as AnyIndex
}

export function searchWiki(query: string): WikiResult[] {
  if (!index) index = buildIndex()
  const results = index.search(query, { limit: 20, enrich: true })
  const seen = new Set<string>()
  const out: WikiResult[] = []
  for (const field of results) {
    for (const hit of field.result as Array<{ id: string; doc: WikiResult }>) {
      if (!seen.has(hit.id)) { seen.add(hit.id); out.push(hit.doc) }
    }
  }
  return out
}
