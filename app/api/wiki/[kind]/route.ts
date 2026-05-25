import { NextRequest, NextResponse } from 'next/server'
import { getEntityList } from '@/lib/wiki'

const VALID_KINDS = ['papers', 'concepts', 'topics', 'ideas', 'experiments', 'methods', 'people', 'foundations']

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params

  if (!VALID_KINDS.includes(kind)) {
    return NextResponse.json({ error: 'Unknown entity kind' }, { status: 400 })
  }

  try {
    const entries = await getEntityList(kind)
    return NextResponse.json({ kind, entries })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to list entities'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
