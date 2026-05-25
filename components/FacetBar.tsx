'use client'

import { MagnifyingGlass } from '@phosphor-icons/react'
import { useResearchStore } from '@/store/researchStore'

const FIELD_OPTIONS = [
  { value: '', label: 'All fields' },
  { value: 'Computer Science', label: 'CS' },
  { value: 'Medicine', label: 'Medicine' },
  { value: 'Physics', label: 'Physics' },
  { value: 'Biology', label: 'Biology' },
  { value: 'Economics', label: 'Economics' },
]

export function FacetBar() {
  const { facets, setFacets } = useResearchStore()

  return (
    <div
      className="flex items-center gap-2 px-5 py-2 border-b flex-wrap"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      <span className="text-[10px] uppercase tracking-wider shrink-0" style={{ color: 'var(--color-text-dim)' }}>
        Filter
      </span>

      {/* Wiki notes search */}
      <div
        className="flex items-center gap-1.5 px-2 py-0.5 rounded border"
        style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}
      >
        <MagnifyingGlass size={11} style={{ color: 'var(--color-text-dim)' }} />
        <input
          type="text"
          value={facets.wikiQuery}
          onChange={(e) => setFacets({ wikiQuery: e.target.value })}
          placeholder="Search wiki notes…"
          className="bg-transparent text-[11px] w-36 outline-none"
          style={{ color: 'var(--color-text)' }}
        />
      </div>

      <input
        type="text"
        value={facets.year}
        onChange={(e) => setFacets({ year: e.target.value })}
        placeholder="Year e.g. 2024"
        className="px-2 py-0.5 rounded text-[11px] border w-28"
        style={{
          background: 'var(--color-surface-2)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
        }}
      />

      <select
        value={facets.field}
        onChange={(e) => setFacets({ field: e.target.value })}
        className="px-2 py-0.5 rounded text-[11px] border"
        style={{
          background: 'var(--color-surface-2)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
        }}
      >
        {FIELD_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <input
        type="number"
        value={facets.minCitations || ''}
        onChange={(e) => setFacets({ minCitations: parseInt(e.target.value || '0', 10) })}
        placeholder="Min citations"
        min={0}
        className="px-2 py-0.5 rounded text-[11px] border w-24"
        style={{
          background: 'var(--color-surface-2)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
        }}
      />
    </div>
  )
}
