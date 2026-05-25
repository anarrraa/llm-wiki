import { readdir, readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import type { Paper, WikiStats } from '@/store/researchStore'
import { canWriteProjectFiles } from '@/lib/runtime'

const S2_BASE = 'https://api.semanticscholar.org/graph/v1'

const WIKI_ROOT = path.join(process.cwd(), 'wiki')
const ENTITY_DIRS = [
  'papers', 'concepts', 'topics', 'ideas',
  'experiments', 'methods', 'people', 'foundations',
] as const

export async function getWikiStats(): Promise<WikiStats> {
  const counts = await Promise.all(
    ENTITY_DIRS.map(async (dir) => {
      const files = await readdir(path.join(WIKI_ROOT, dir)).catch(() => [])
      return files.filter((f) => f.endsWith('.md')).length
    })
  )
  return Object.fromEntries(ENTITY_DIRS.map((d, i) => [d, counts[i]])) as unknown as WikiStats
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

export async function savePaperToWiki(paper: Paper): Promise<string> {
  if (!canWriteProjectFiles()) {
    throw new Error('Wiki saving is disabled on Vercel. Connect persistent storage before enabling writes.')
  }

  const slug = paper.arxivId ? paper.arxivId.replace('/', '-') : slugify(paper.title)
  const filePath = path.join(WIKI_ROOT, 'papers', `${slug}.md`)

  const date = paper.published ? paper.published.slice(0, 10) : new Date().toISOString().slice(0, 10)

  const content = `---
kind: paper
title: "${paper.title.replace(/"/g, '\\"')}"
slug: ${slug}
status: discovered
arxiv_id: ${paper.arxivId}
arxiv_url: ${paper.arxivUrl}
authors:
${paper.authors.map((a) => `  - ${a}`).join('\n')}
category: ${paper.category}
published: ${date}
added: ${new Date().toISOString().slice(0, 10)}
---

## Abstract

${paper.abstract}

## Notes

<!-- Add notes here -->
`

  await writeFile(filePath, content, 'utf-8')

  await appendLog(`saved paper: [[${slug}]] — ${paper.title}`)

  if (process.env.S2_API_KEY && paper.arxivId) {
    appendS2Edges(paper.arxivId).catch(() => {})
  }

  return slug
}

async function appendS2Edges(fromArxivId: string): Promise<void> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'llm-wiki/0.1',
    }
    if (process.env.S2_API_KEY) headers['x-api-key'] = process.env.S2_API_KEY

    const res = await fetch(
      `${S2_BASE}/paper/arXiv:${fromArxivId}?fields=references,citations`,
      { headers }
    )
    if (!res.ok) return

    const data = await res.json()
    const ts = new Date().toISOString()
    const edgesPath = path.join(WIKI_ROOT, 'graph', 'edges.jsonl')
    const lines: string[] = []

    for (const ref of (data.references ?? []) as Array<{ externalIds?: Record<string, string> }>) {
      const toArxiv = ref.externalIds?.ArXiv
      if (toArxiv) {
        lines.push(JSON.stringify({ from: fromArxivId, to: toArxiv, type: 'cites', ts }))
      }
    }

    for (const cit of (data.citations ?? []) as Array<{ externalIds?: Record<string, string> }>) {
      const toArxiv = cit.externalIds?.ArXiv
      if (toArxiv) {
        lines.push(JSON.stringify({ from: toArxiv, to: fromArxivId, type: 'cites', ts }))
      }
    }

    if (lines.length > 0) {
      await writeFile(edgesPath, '\n' + lines.join('\n'), { flag: 'a', encoding: 'utf-8' })
    }
  } catch {}
}

export async function appendLog(message: string): Promise<void> {
  const logPath = path.join(WIKI_ROOT, 'log.md')
  const ts = new Date().toISOString()
  const line = `\n- \`${ts}\` ${message}`
  await writeFile(logPath, line, { flag: 'a', encoding: 'utf-8' })
}

export async function getRecentPapers(limit = 10): Promise<Array<{ slug: string; title: string; date: string }>> {
  const dir = path.join(WIKI_ROOT, 'papers')
  const files = await readdir(dir).catch(() => [])
  const mdFiles = files.filter((f) => f.endsWith('.md') && f !== '.gitkeep').slice(0, limit)

  const papers = await Promise.all(
    mdFiles.map(async (f) => {
      const content = await readFile(path.join(dir, f), 'utf-8').catch(() => '')
      const titleMatch = content.match(/^title:\s*"?(.+?)"?\s*$/m)
      const dateMatch = content.match(/^added:\s*(.+?)\s*$/m)
      return {
        slug: f.replace('.md', ''),
        title: titleMatch?.[1] ?? f.replace('.md', ''),
        date: dateMatch?.[1] ?? '',
      }
    })
  )

  return papers
}
