import { NextRequest, NextResponse } from 'next/server'
import { getWikiStats, savePaperToWiki, getRecentPapers } from '@/lib/wiki'
import type { Paper } from '@/store/researchStore'

export async function GET() {
  try {
    const [stats, recent] = await Promise.all([getWikiStats(), getRecentPapers(8)])
    return NextResponse.json({ stats, recent })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'wiki read failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const paper: Paper = await req.json()
    if (!paper?.title) {
      return NextResponse.json({ error: 'Invalid paper payload' }, { status: 400 })
    }
    const slug = await savePaperToWiki(paper)
    return NextResponse.json({ slug })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'wiki write failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
