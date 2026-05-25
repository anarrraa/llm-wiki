import { NextRequest, NextResponse } from 'next/server'
import { searchWiki } from '@/lib/wiki-search'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ error: 'Missing ?q=' }, { status: 400 })
  const results = searchWiki(q)
  return NextResponse.json({ results })
}
