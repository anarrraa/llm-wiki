'use client'

import { motion } from 'framer-motion'
import { ArrowSquareOut, CheckSquare, Square } from '@phosphor-icons/react'
import { useResearchStore, type Paper } from '@/store/researchStore'

interface Props {
  paper: Paper
  index: number
  inWiki?: boolean
}

export function PaperCard({ paper, index, inWiki }: Props) {
  const { selectedIds, toggleSelect } = useResearchStore()
  const selected = selectedIds.has(paper.id)

  const dateStr = paper.published
    ? new Date(paper.published).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : ''

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{
        duration: 0.2,
        delay: index * 0.03,
        type: 'spring',
        stiffness: 260,
        damping: 28,
      }}
      onClick={() => toggleSelect(paper.id)}
      className="flex gap-3 px-5 py-3.5 cursor-pointer border-b group transition-colors duration-100"
      style={{
        borderColor: 'var(--color-border-subtle)',
        background: selected ? 'var(--color-accent-glow)' : 'transparent',
      }}
    >
      {/* Checkbox */}
      <div className="pt-0.5 flex-shrink-0">
        {selected ? (
          <CheckSquare size={16} weight="fill" style={{ color: 'var(--color-accent)' }} />
        ) : (
          <Square size={16} style={{ color: 'var(--color-text-dim)' }} className="group-hover:text-zinc-500 transition-colors" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-1.5 flex-wrap">
            <p
              className="text-sm font-medium leading-snug"
              style={{ color: 'var(--color-text)' }}
            >
              {paper.title}
            </p>
            {inWiki && (
              <span
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                In Wiki
              </span>
            )}
            {paper.source && (
              <span
                className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                style={{
                  background: paper.source === 'S2' ? 'rgba(96,165,250,0.12)' : 'rgba(167,139,250,0.12)',
                  color: paper.source === 'S2' ? '#60a5fa' : '#a78bfa',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {paper.source}
              </span>
            )}
          </div>
          {paper.arxivUrl && (
            <a
              href={paper.arxivUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
            >
              <ArrowSquareOut size={13} style={{ color: 'var(--color-text-muted)' }} />
            </a>
          )}
        </div>

        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
          {paper.authors.slice(0, 3).join(', ')}
          {paper.authors.length > 3 && ` +${paper.authors.length - 3}`}
        </p>

        <p
          className="text-xs mt-1.5 leading-relaxed line-clamp-2"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {paper.abstract}
        </p>

        <div className="flex items-center gap-3 mt-2">
          {paper.category && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--color-surface-2)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {paper.category}
            </span>
          )}
          {dateStr && (
            <span className="text-[10px]" style={{ color: 'var(--color-text-dim)' }}>
              {dateStr}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
