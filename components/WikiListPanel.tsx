'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowSquareOut } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useResearchStore } from '@/store/researchStore'
import { ENTITY_META } from '@/lib/wiki-entities'
import type { WikiEntry } from '@/lib/wiki'

type EntryFm = Record<string, string | string[] | undefined>

interface ListResponse {
  kind: string
  entries: WikiEntry[]
}

export function WikiListPanel({ kind }: { kind: string }) {
  const setWikiView = useResearchStore((s) => s.setWikiView)

  const meta = ENTITY_META.find((m) => m.key === kind)
  const Icon = meta?.Icon
  const color = meta?.color ?? '#60a5fa'
  const label = meta?.label ?? kind

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ['wiki-list', kind],
    queryFn: () => fetch(`/api/wiki/${kind}`).then((r) => r.json()),
  })

  const entries = data?.entries ?? []

  return (
    <main
      className="flex flex-col h-full overflow-hidden border-r"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={() => setWikiView({ type: 'search' })}
          className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft size={14} />
        </button>
        {Icon && <Icon size={16} style={{ color, flexShrink: 0 }} />}
        <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>
          {label}
        </span>
        {!isLoading && (
          <span
            className="ml-auto text-xs tabular-nums font-mono px-2 py-0.5 rounded"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
          >
            {entries.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <ListSkeleton />}

        {!isLoading && entries.length === 0 && (
          <EmptyKind label={label} />
        )}

        <AnimatePresence mode="popLayout">
          {!isLoading && entries.map((entry, i) => (
            <motion.div
              key={entry.slug}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.18 }}
              onClick={() => setWikiView({ type: 'wiki-entry', kind, slug: entry.slug })}
              className="flex flex-col gap-1 px-5 py-3.5 border-b cursor-pointer transition-colors"
              style={{
                borderColor: 'var(--color-border-subtle)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              {(() => {
                const fm = entry.frontmatter as EntryFm
                return (
                  <>
                    <div className="flex items-start gap-2">
                      <p
                        className="flex-1 text-sm font-medium leading-snug line-clamp-2"
                        style={{ color: 'var(--color-text)' }}
                      >
                        {entry.title}
                      </p>
                      {fm.arxiv_url && (
                        <a
                          href={String(fm.arxiv_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-30 hover:opacity-70 transition-opacity mt-0.5"
                        >
                          <ArrowSquareOut size={12} style={{ color: 'var(--color-text-muted)' }} />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {fm.status && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                          style={{ background: 'var(--color-surface-2)', color }}
                        >
                          {fm.status}
                        </span>
                      )}
                      {fm.category && (
                        <span className="text-[10px]" style={{ color: 'var(--color-text-dim)' }}>
                          {fm.category}
                        </span>
                      )}
                      {entry.date && (
                        <span className="text-[10px] ml-auto" style={{ color: 'var(--color-text-dim)' }}>
                          {entry.date}
                        </span>
                      )}
                    </div>

                    {Array.isArray(fm.authors) && (
                      <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {(fm.authors as string[]).slice(0, 3).join(', ')}
                        {(fm.authors as string[]).length > 3 && ' et al.'}
                      </p>
                    )}
                  </>
                )
              })()}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </main>
  )
}

function ListSkeleton() {
  return (
    <div className="px-5 py-3 flex flex-col gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
          className="flex flex-col gap-2 py-2 border-b"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <div className="h-3.5 rounded-sm" style={{ background: 'var(--color-surface-2)', width: `${60 + (i % 3) * 12}%` }} />
          <div className="h-2.5 rounded-sm" style={{ background: 'var(--color-surface-2)', width: '35%' }} />
        </motion.div>
      ))}
    </div>
  )
}

function EmptyKind({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-start justify-center h-full px-8">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-4"
        style={{ background: 'var(--color-surface-2)' }}
      >
        <span className="text-sm" style={{ color: 'var(--color-text-dim)' }}>0</span>
      </div>
      <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
        No {label} yet
      </h2>
      <p className="text-xs leading-relaxed max-w-[260px]" style={{ color: 'var(--color-text-muted)' }}>
        Search for papers and save them to your wiki to start building your knowledge graph.
      </p>
    </div>
  )
}
