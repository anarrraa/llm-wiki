'use client'

import { motion } from 'framer-motion'
import { Circle } from '@phosphor-icons/react'
import { useResearchStore } from '@/store/researchStore'
import { ENTITY_META } from '@/lib/wiki-entities'

interface Props {
  recent: Array<{ slug: string; title: string; date: string }>
}

export function WikiSidebar({ recent }: Props) {
  const stats = useResearchStore((s) => s.wikiStats)
  const wikiView = useResearchStore((s) => s.wikiView)
  const setWikiView = useResearchStore((s) => s.setWikiView)

  return (
    <aside
      className="flex flex-col h-full overflow-hidden border-r"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
            style={{ background: 'var(--color-accent)', color: '#09090b' }}
          >
            W
          </div>
          <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>
            llm-wiki
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          knowledge graph
        </p>
      </div>

      {/* Entity counts */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <p
          className="text-[10px] uppercase tracking-widest mb-2 px-1"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Graph
        </p>

        <div className="flex flex-col gap-0.5">
          {ENTITY_META.map(({ key, label, Icon, color }, i) => {
            const count = stats ? (stats as unknown as Record<string, number>)[key] ?? 0 : null
            const isActive = wikiView.type !== 'search' && 'kind' in wikiView && wikiView.kind === key
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                onClick={() => setWikiView({ type: 'wiki-list', kind: key })}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer group transition-colors"
                style={{
                  color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
                  background: isActive ? 'var(--color-surface-2)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <Icon size={14} style={{ color, flexShrink: 0 }} />
                <span className="text-xs flex-1">{label}</span>
                <span
                  className="text-xs tabular-nums font-mono"
                  style={{ color: count ? 'var(--color-text-muted)' : 'var(--color-text-dim)' }}
                >
                  {count ?? '—'}
                </span>
              </motion.div>
            )
          })}
        </div>

        {/* Recent papers */}
        {recent.length > 0 && (
          <div className="mt-5">
            <p
              className="text-[10px] uppercase tracking-widest mb-2 px-1"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Recent
            </p>
            <div className="flex flex-col gap-1">
              {recent.map((p, i) => (
                <motion.div
                  key={p.slug}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.04 }}
                  onClick={() => setWikiView({ type: 'wiki-entry', kind: 'papers', slug: p.slug })}
                  className="px-2 py-1.5 rounded cursor-pointer transition-colors"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <p className="text-xs leading-tight line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                    {p.title}
                  </p>
                  {p.date && (
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
                      {p.date}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {recent.length === 0 && !stats && (
          <div className="mt-5 px-2">
            <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
              Search for papers to start building your wiki.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-1.5">
          <Circle
            size={6}
            weight="fill"
            style={{ color: '#34d399', flexShrink: 0 }}
          />
          <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
            TeX Live 2026
          </span>
        </div>
      </div>
    </aside>
  )
}
