import { readdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import type { Paper, WikiStats } from '@/store/researchStore'
import { canWriteProjectFiles, hasGitHubConfig } from '@/lib/runtime'
import { ghListDir, ghReadFile, ghWriteFile, ghAppendFile, ghGetFile } from '@/lib/github-wiki'

const S2_BASE = 'https://api.semanticscholar.org/graph/v1'

const WIKI_ROOT = path.join(process.cwd(), 'wiki')
const ENTITY_DIRS = [
  'papers', 'concepts', 'topics', 'ideas',
  'experiments', 'methods', 'people', 'foundations',
] as const

export async function getWikiStats(): Promise<WikiStats> {
  if (hasGitHubConfig()) {
    const counts = await Promise.all(
      ENTITY_DIRS.map(async (dir) => {
        const files = await ghListDir(`wiki/${dir}`)
        return files.filter((f) => f.endsWith('.md')).length
      })
    )
    return Object.fromEntries(ENTITY_DIRS.map((d, i) => [d, counts[i]])) as unknown as WikiStats
  }

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
    throw new Error('Wiki saving is disabled. Set GITHUB_TOKEN and GITHUB_REPO env vars to enable writes on Vercel.')
  }

  const slug = paper.arxivId ? paper.arxivId.replace('/', '-') : slugify(paper.title)
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

  if (hasGitHubConfig()) {
    const ghPath = `wiki/papers/${slug}.md`
    const existing = await ghGetFile(ghPath)
    await ghWriteFile(ghPath, content, `wiki: add paper ${slug}`, existing?.sha)
  } else {
    const filePath = path.join(WIKI_ROOT, 'papers', `${slug}.md`)
    await writeFile(filePath, content, 'utf-8')
  }

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
      if (hasGitHubConfig()) {
        await ghAppendFile('wiki/graph/edges.jsonl', '\n' + lines.join('\n'), `wiki: s2 edges for ${fromArxivId}`)
      } else {
        await writeFile(edgesPath, '\n' + lines.join('\n'), { flag: 'a', encoding: 'utf-8' })
      }
    }
  } catch {}
}

export async function appendLog(message: string): Promise<void> {
  const ts = new Date().toISOString()
  const line = `\n- \`${ts}\` ${message}`
  if (hasGitHubConfig()) {
    await ghAppendFile('wiki/log.md', line, `wiki: log update`)
  } else {
    const logPath = path.join(WIKI_ROOT, 'log.md')
    await writeFile(logPath, line, { flag: 'a', encoding: 'utf-8' })
  }
}

export async function getRecentPapers(limit = 10): Promise<Array<{ slug: string; title: string; date: string }>> {
  if (hasGitHubConfig()) {
    const files = await ghListDir('wiki/papers')
    const mdFiles = files.filter((f) => f.endsWith('.md') && f !== '.gitkeep').slice(0, limit)
    return Promise.all(
      mdFiles.map(async (f) => {
        const content = await ghReadFile(`wiki/papers/${f}`).catch(() => '')
        const titleMatch = content?.match(/^title:\s*"?(.+?)"?\s*$/m)
        const dateMatch = content?.match(/^added:\s*(.+?)\s*$/m)
        return {
          slug: f.replace('.md', ''),
          title: titleMatch?.[1] ?? f.replace('.md', ''),
          date: dateMatch?.[1] ?? '',
        }
      })
    )
  }

  const dir = path.join(WIKI_ROOT, 'papers')
  const files = await readdir(dir).catch(() => [])
  const mdFiles = files.filter((f) => f.endsWith('.md') && f !== '.gitkeep').slice(0, limit)

  return Promise.all(
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
}

// ─── Entity browser ───────────────────────────────────────────────────────────

export interface WikiEntry {
  slug: string
  title: string
  date: string
  frontmatter: Record<string, unknown>
}

export interface WikiEntryDetail extends WikiEntry {
  kind: string
  body: string
  raw: string
}

export async function getEntityList(kind: string): Promise<WikiEntry[]> {
  if (hasGitHubConfig()) {
    const files = await ghListDir(`wiki/${kind}`)
    const mdFiles = files.filter((f) => f.endsWith('.md') && f !== '.gitkeep')
    return Promise.all(
      mdFiles.map(async (f) => {
        const raw = await ghReadFile(`wiki/${kind}/${f}`).catch(() => '')
        const { data } = matter(raw ?? '')
        return {
          slug: f.replace('.md', ''),
          title: String(data.title ?? f.replace('.md', '')),
          date: String(data.added ?? data.published ?? ''),
          frontmatter: data,
        }
      })
    )
  }

  const dir = path.join(WIKI_ROOT, kind)
  const files = await readdir(dir).catch(() => [])
  const mdFiles = files.filter((f) => f.endsWith('.md') && f !== '.gitkeep')
  return Promise.all(
    mdFiles.map(async (f) => {
      const raw = await readFile(path.join(dir, f), 'utf-8').catch(() => '')
      const { data } = matter(raw)
      return {
        slug: f.replace('.md', ''),
        title: String(data.title ?? f.replace('.md', '')),
        date: String(data.added ?? data.published ?? ''),
        frontmatter: data,
      }
    })
  )
}

export async function getEntityEntry(kind: string, slug: string): Promise<WikiEntryDetail | null> {
  let raw: string | null = null

  if (hasGitHubConfig()) {
    raw = await ghReadFile(`wiki/${kind}/${slug}.md`).catch(() => null)
  } else {
    raw = await readFile(path.join(WIKI_ROOT, kind, `${slug}.md`), 'utf-8').catch(() => null)
  }

  if (!raw) return null
  const { data, content } = matter(raw)
  return {
    slug,
    kind,
    title: String(data.title ?? slug),
    date: String(data.added ?? data.published ?? ''),
    frontmatter: data,
    body: content,
    raw,
  }
}
