import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  const { url, type = 'web' }: { url: string; type?: 'web' | 'paper' } = await req.json()

  if (!url) {
    return NextResponse.json({ error: 'url required' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'llm-wiki/0.1 (research agent)' },
    })

    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)

    const contentType = res.headers.get('content-type') ?? ''
    const isPdf = contentType.includes('pdf') || url.endsWith('.pdf')

    const rawDir = path.join(process.cwd(), 'raw', isPdf ? 'papers' : type)
    await mkdir(rawDir, { recursive: true })

    const slug = url
      .replace(/https?:\/\//, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .slice(0, 80)

    if (isPdf) {
      const buf = Buffer.from(await res.arrayBuffer())
      const filePath = path.join(rawDir, `${slug}.pdf`)
      await writeFile(filePath, buf)
      return NextResponse.json({ saved: filePath, type: 'pdf', bytes: buf.length })
    } else {
      const text = await res.text()
      const filePath = path.join(rawDir, `${slug}.html`)
      await writeFile(filePath, text, 'utf-8')
      const excerpt = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 500)
      return NextResponse.json({ saved: filePath, type: 'html', excerpt })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
