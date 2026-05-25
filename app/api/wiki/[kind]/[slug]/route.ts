import { NextRequest, NextResponse } from 'next/server'
import { getEntityEntry } from '@/lib/wiki'

const VALID_KINDS = ['papers', 'concepts', 'topics', 'ideas', 'experiments', 'methods', 'people', 'foundations']

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kind: string; slug: string }> }
) {
  const { kind, slug } = await params

  if (!VALID_KINDS.includes(kind)) {
    return NextResponse.json({ error: 'Unknown entity kind' }, { status: 400 })
  }

  // Basic slug validation — prevent path traversal
  if (!/^[a-zA-Z0-9._-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }

  try {
    const entry = await getEntityEntry(kind, slug)
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(entry)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch entry'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
