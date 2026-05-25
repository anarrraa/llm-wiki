'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, ArrowSquareOut } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useResearchStore } from '@/store/researchStore'
import { ENTITY_META } from '@/lib/wiki-entities'
import type { WikiEntryDetail } from '@/lib/wiki'

export function WikiEntryPanel({ kind, slug }: { kind: string; slug: string }) {
  const setWikiView = useResearchStore((s) => s.setWikiView)

  const meta = ENTITY_META.find((m) => m.key === kind)
  const color = meta?.color ?? '#60a5fa'
  const label = meta?.label ?? kind

  const { data, isLoading } = useQuery<WikiEntryDetail>({
    queryKey: ['wiki-entry', kind, slug],
    queryFn: () => fetch(`/api/wiki/${kind}/${slug}`).then((r) => r.json()),
  })

  const fm = data?.frontmatter as Record<string, string | string[] | undefined> | undefined

  return (
    <main
      className="flex flex-col h-full overflow-hidden border-r"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={() => setWikiView({ type: 'wiki-list', kind })}
          className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft size={14} />
        </button>
        <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
          {label}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>/</span>
        <span className="text-xs font-mono truncate max-w-[200px]" style={{ color: 'var(--color-text-muted)' }}>
          {slug}
        </span>
        {fm?.arxiv_url && (
          <a
            href={String(fm.arxiv_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto opacity-40 hover:opacity-80 transition-opacity"
          >
            <ArrowSquareOut size={13} style={{ color: 'var(--color-text-muted)' }} />
          </a>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <EntrySkeleton />}

        {!isLoading && data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {/* Frontmatter metadata */}
            <div className="px-6 pt-5 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h1
                className="text-base font-semibold leading-snug mb-3"
                style={{ color: 'var(--color-text)' }}
              >
                {data.title}
              </h1>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {fm?.kind && (
                  <Badge style={{ background: 'var(--color-surface-2)', color }}>
                    {String(fm.kind)}
                  </Badge>
                )}
                {fm?.status && (
                  <Badge style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                    {String(fm.status)}
                  </Badge>
                )}
                {fm?.category && (
                  <Badge style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                    {String(fm.category)}
                  </Badge>
                )}
              </div>

              {Array.isArray(fm?.authors) && (
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  {(fm!.authors as string[]).join(', ')}
                </p>
              )}

              <div className="flex gap-4">
                {fm?.published && (
                  <MetaRow label="Published" value={String(fm.published)} />
                )}
                {fm?.added && (
                  <MetaRow label="Added" value={String(fm.added)} />
                )}
              </div>
            </div>

            {/* Markdown body */}
            <div className="px-6 py-5">
              <MarkdownBody body={data.body} />
            </div>
          </motion.div>
        )}
      </div>
    </main>
  )
}

function Badge({ children, style }: { children: React.ReactNode; style: React.CSSProperties }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={style}>
      {children}
    </span>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>
        {label}
      </span>
      <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
        {value}
      </span>
    </div>
  )
}

function MarkdownBody({ body }: { body: string }) {
  const paragraphs = body.split(/\n{2,}/)

  return (
    <div className="flex flex-col gap-3">
      {paragraphs.map((para, i) => {
        const trimmed = para.trim()
        if (!trimmed || trimmed.startsWith('<!--')) return null

        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={i}
              className="text-xs font-semibold uppercase tracking-wider pt-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {trimmed.slice(3)}
            </h2>
          )
        }

        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={i} className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {trimmed.slice(2)}
            </h1>
          )
        }

        return (
          <p key={i} className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {trimmed}
          </p>
        )
      })}
    </div>
  )
}

function EntrySkeleton() {
  return (
    <div className="px-6 py-5 flex flex-col gap-4">
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 1.4, repeat: Infinity }}
        className="h-5 rounded-sm w-3/4"
        style={{ background: 'var(--color-surface-2)' }}
      />
      <div className="flex gap-2">
        {[60, 80, 50].map((w, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
            className="h-4 rounded-sm"
            style={{ background: 'var(--color-surface-2)', width: `${w}px` }}
          />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.08 }}
          className="h-3 rounded-sm"
          style={{ background: 'var(--color-surface-2)', width: `${50 + (i % 4) * 12}%` }}
        />
      ))}
    </div>
  )
}
