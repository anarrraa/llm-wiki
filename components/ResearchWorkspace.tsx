'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useResearchStore } from '@/store/researchStore'
import { WikiSidebar } from './WikiSidebar'
import { ResearchPanel } from './ResearchPanel'
import { LatexWorkspace } from './LatexWorkspace'

async function fetchWikiData() {
  const res = await fetch('/api/wiki')
  if (!res.ok) throw new Error('wiki fetch failed')
  return res.json()
}

export function ResearchWorkspace() {
  const setWikiStats = useResearchStore((s) => s.setWikiStats)

  const { data } = useQuery({
    queryKey: ['wiki-stats'],
    queryFn: fetchWikiData,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (data?.stats) setWikiStats(data.stats)
  }, [data, setWikiStats])

  return (
    <div
      className="grid h-[100dvh] overflow-hidden"
      style={{ gridTemplateColumns: '220px 1fr 480px' }}
    >
      <WikiSidebar recent={data?.recent ?? []} />
      <ResearchPanel />
      <LatexWorkspace />
    </div>
  )
}
