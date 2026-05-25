'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlass,
  ArrowRight,
  CheckSquare,
  Square,
  ArrowSquareOut,
  FloppyDisk,
  Sparkle,
  X,
  Plus,
  CaretDown,
  CaretRight,
  Check,
  Warning,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import { useResearchStore, type Paper } from '@/store/researchStore'
import { PaperCard } from './PaperCard'
import { FacetBar } from './FacetBar'

const PLACEHOLDERS = [
  'transformer attention mechanisms...',
  'diffusion models for generation...',
  'LLM reasoning and chain of thought...',
  'retrieval augmented generation...',
  'graph neural network applications...',
  'vision language model alignment...',
]

export function ResearchPanel() {
  const {
    topic, setTopic,
    papers, setPapers,
    s2Papers, setS2Papers,
    facets,
    selectedIds, toggleSelect, selectAll, clearSelection,
    status, setStatus, setError, error,
    setLatex, setActiveTab,
  } = useResearchStore()

  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0])
  const [phIndex, setPhIndex] = useState(0)
  const [similarPapers, setSimilarPapers] = useState<Paper[]>([])
  const [similarOpen, setSimilarOpen] = useState(false)
  const [wikiSlugs, setWikiSlugs] = useState<Set<string>>(new Set())
  const [wikiResults, setWikiResults] = useState<Array<{ slug: string; title: string; arxivId: string }>>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveToast, setSaveToast] = useState<{ ok: boolean; msg: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const similarDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wikiSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSelectedRef = useRef<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    const id = setInterval(() => {
      setPhIndex((i) => {
        const next = (i + 1) % PLACEHOLDERS.length
        setPlaceholder(PLACEHOLDERS[next])
        return next
      })
    }, 3500)
    return () => clearInterval(id)
  }, [])

  // Fetch wiki slugs to show "In Wiki" badges
  useEffect(() => {
    fetch('/api/wiki')
      .then((r) => r.json())
      .then((d) => {
        const slugs = new Set<string>((d.recent ?? []).map((p: { slug: string }) => p.slug))
        setWikiSlugs(slugs)
      })
      .catch(() => {})
  }, [])

  // Debounced wiki notes search
  useEffect(() => {
    if (wikiSearchDebounceRef.current) clearTimeout(wikiSearchDebounceRef.current)
    if (!facets.wikiQuery.trim()) { setWikiResults([]); return }
    wikiSearchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/wiki?q=${encodeURIComponent(facets.wikiQuery)}`)
        const data = await res.json()
        setWikiResults(data.results ?? [])
      } catch { setWikiResults([]) }
    }, 350)
  }, [facets.wikiQuery])

  // Debounced similarity fetch for most recently selected paper
  useEffect(() => {
    const arr = Array.from(selectedIds)
    const last = arr[arr.length - 1] ?? null

    if (!last || last === lastSelectedRef.current) return
    lastSelectedRef.current = last

    if (similarDebounceRef.current) clearTimeout(similarDebounceRef.current)
    similarDebounceRef.current = setTimeout(async () => {
      const paper = papers.find((p) => p.id === last) ?? s2Papers.find((p) => p.id === last)
      const arxivId = paper?.arxivId
      if (!arxivId) return
      try {
        const res = await fetch(`/api/similar?arxivId=${encodeURIComponent(arxivId)}`)
        const data = await res.json()
        if (data.papers?.length) {
          setSimilarPapers(data.papers)
          setSimilarOpen(true)
        }
      } catch {}
    }, 400)
  }, [selectedIds, papers, s2Papers])

  const search = useCallback(async () => {
    if (!topic.trim() || status === 'searching') return
    setStatus('searching')
    setError(null)
    setPapers([])
    setS2Papers([])
    setSimilarPapers([])

    try {
      const [arxivRes, s2Res] = await Promise.all([
        fetch(`/api/arxiv?q=${encodeURIComponent(topic)}&max=20`),
        fetch(
          `/api/search/papers?q=${encodeURIComponent(topic)}` +
            (facets.year ? `&year=${encodeURIComponent(facets.year)}` : '') +
            (facets.field ? `&field=${encodeURIComponent(facets.field)}` : '') +
            (facets.minCitations ? `&minCitations=${facets.minCitations}` : '')
        ),
      ])

      const arxivData = await arxivRes.json()
      const s2Data = await s2Res.json().catch(() => ({ papers: [] }))

      const arxivPapers: Paper[] = (arxivData.papers ?? []).map((p: Paper) => ({
        ...p,
        source: 'arXiv' as const,
      }))

      const arxivIds = new Set(arxivPapers.map((p) => p.arxivId).filter(Boolean))

      const s2Only: Paper[] = (s2Data.papers ?? [])
        .filter((p: Paper) => p.arxivId && !arxivIds.has(p.arxivId))
        .map((p: Paper) => ({ ...p, source: 'S2' as const }))

      setS2Papers(s2Only)
      setPapers([...arxivPapers, ...s2Only])
      setStatus('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setStatus('error')
    }
  }, [topic, status, facets, setStatus, setError, setPapers, setS2Papers])

  const generate = useCallback(async () => {
    const selected = papers.filter((p) => selectedIds.has(p.id))
    if (!selected.length) return
    setStatus('generating')
    setError(null)
    setLatex('')
    setActiveTab('source')

    try {
      const res = await fetch('/api/latex/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, papers: selected }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'generation failed')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let acc = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          acc += decoder.decode(value, { stream: true })
          setLatex(acc)
        }
      }

      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setStatus('error')
    }
  }, [papers, selectedIds, topic, setStatus, setError, setLatex, setActiveTab])

  const saveSelected = useCallback(async () => {
    const selected = papers.filter((p) => selectedIds.has(p.id))
    if (!selected.length) return
    setIsSaving(true)
    setSaveToast(null)
    setError(null)

    let saved = 0
    const newSlugs = new Set(wikiSlugs)

    try {
      // Sequential — avoid concurrent appendLog SHA collisions
      for (const p of selected) {
        const res = await fetch('/api/wiki', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Save failed' }))
          throw new Error(data.error ?? 'Save failed')
        }
        const { slug } = await res.json()
        if (slug) newSlugs.add(slug)
        saved++
      }

      setWikiSlugs(newSlugs)
      queryClient.invalidateQueries({ queryKey: ['wiki-stats'] })
      setSaveToast({ ok: true, msg: `Saved ${saved} paper${saved !== 1 ? 's' : ''} to wiki` })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      setSaveToast({ ok: false, msg })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveToast(null), 4000)
    }
  }, [papers, selectedIds, wikiSlugs, queryClient, setError])

  const addSimilarPaper = useCallback(
    (paper: Paper) => {
      if (!papers.find((p) => p.id === paper.id)) {
        setPapers([...papers, { ...paper, source: 'S2' as const }])
      }
      toggleSelect(paper.id)
    },
    [papers, setPapers, toggleSelect]
  )

  const isSearching = status === 'searching'
  const isGenerating = status === 'generating'
  const selectedCount = selectedIds.size
  const isBusy = isSaving || isGenerating

  return (
    <main
      className="flex flex-col h-full overflow-hidden border-r"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
    >
      {/* Search bar */}
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-200 focus-within:border-blue-500/40 focus-within:shadow-[0_0_0_3px_rgba(96,165,250,0.06)]"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <MagnifyingGlass
            size={16}
            style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
          />
          <input
            ref={inputRef}
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm placeholder:transition-all"
            style={{ color: 'var(--color-text)', fontSize: '0.875rem' }}
          />
          {topic && (
            <button
              onClick={() => { setTopic(''); setPapers([]); setS2Papers([]) }}
              className="opacity-40 hover:opacity-70 transition-opacity"
            >
              <X size={14} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          )}
          <button
            onClick={search}
            disabled={!topic.trim() || isSearching}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 active:scale-[0.97] disabled:opacity-40"
            style={{
              background: 'var(--color-accent)',
              color: '#09090b',
            }}
          >
            {isSearching ? (
              <SearchingDots />
            ) : (
              <>
                <span>Search</span>
                <ArrowRight size={12} weight="bold" />
              </>
            )}
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs mt-2 px-1"
              style={{ color: '#f87171' }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Facet bar */}
      <FacetBar />

      {/* Toolbar when papers loaded */}
      <AnimatePresence>
        {papers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 px-5 py-2.5 border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {papers.length} papers
            </span>
            <div className="flex-1" />
            <button
              onClick={selectedCount === papers.length ? clearSelection : selectAll}
              className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {selectedCount === papers.length ? (
                <CheckSquare size={14} style={{ color: 'var(--color-accent)' }} />
              ) : (
                <Square size={14} />
              )}
              {selectedCount === papers.length ? 'Deselect all' : 'Select all'}
            </button>

            {selectedCount > 0 && (
              <>
                <button
                  onClick={saveSelected}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <FloppyDisk size={14} className={isSaving ? 'animate-pulse' : ''} />
                  {isSaving ? 'Saving…' : 'Save to wiki'}
                </button>

                <button
                  onClick={generate}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 active:scale-[0.97] disabled:opacity-50"
                  style={{
                    background: isGenerating ? 'var(--color-surface-2)' : 'var(--color-accent-glow)',
                    color: 'var(--color-accent)',
                    border: '1px solid var(--color-accent-border)',
                  }}
                >
                  <Sparkle size={12} weight={isGenerating ? 'regular' : 'fill'} />
                  {isGenerating ? 'Generating…' : `Generate LaTeX (${selectedCount})`}
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save toast */}
      <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-2 px-5 py-2 border-b text-xs"
            style={{
              borderColor: 'var(--color-border)',
              background: saveToast.ok ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)',
              color: saveToast.ok ? '#34d399' : '#f87171',
            }}
          >
            {saveToast.ok ? <Check size={12} weight="bold" /> : <Warning size={12} weight="bold" />}
            {saveToast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paper list */}
      <div className="flex-1 overflow-y-auto">
        {isSearching && <SearchSkeleton />}

        {!isSearching && papers.length === 0 && !facets.wikiQuery && (
          <EmptyState topic={topic} />
        )}

        {/* Wiki notes search results */}
        <AnimatePresence>
          {wikiResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="px-5 py-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>
                Wiki notes ({wikiResults.length})
              </div>
              {wikiResults.map((r) => (
                <div
                  key={r.slug}
                  className="flex items-center gap-3 px-5 py-2 border-b"
                  style={{ borderColor: 'var(--color-border-subtle)' }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: '#34d399' }}
                  />
                  <span className="flex-1 text-xs truncate" style={{ color: 'var(--color-text)' }}>
                    {r.title}
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-dim)' }}>
                    {r.slug}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {!isSearching && papers.map((paper, i) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              index={i}
              inWiki={wikiSlugs.has(paper.arxivId?.replace('/', '-') ?? '')}
            />
          ))}
        </AnimatePresence>

        {/* Similarity panel */}
        <AnimatePresence>
          {similarPapers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <button
                onClick={() => setSimilarOpen((o) => !o)}
                className="flex items-center gap-2 w-full px-5 py-2.5 text-xs text-left"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {similarOpen ? <CaretDown size={12} /> : <CaretRight size={12} />}
                <span>You might also like</span>
                <span
                  className="ml-1 px-1.5 py-0.5 rounded text-[10px]"
                  style={{ background: 'var(--color-surface-2)' }}
                >
                  {similarPapers.length}
                </span>
              </button>

              <AnimatePresence>
                {similarOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {similarPapers.map((p) => (
                      <SimilarRow
                        key={p.id}
                        paper={p}
                        onAdd={() => addSimilarPaper(p)}
                        selected={selectedIds.has(p.id)}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}

function SimilarRow({ paper, onAdd, selected }: { paper: Paper; onAdd: () => void; selected: boolean }) {
  const year = paper.published ? paper.published.slice(0, 4) : ''
  return (
    <div
      className="flex items-center gap-3 px-5 py-2 border-b"
      style={{ borderColor: 'var(--color-border-subtle)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>
          {paper.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {year && (
            <span className="text-[10px]" style={{ color: 'var(--color-text-dim)' }}>{year}</span>
          )}
          {paper.citationCount != null && (
            <span className="text-[10px]" style={{ color: 'var(--color-text-dim)' }}>
              {paper.citationCount} citations
            </span>
          )}
        </div>
      </div>
      {paper.arxivUrl && (
        <a
          href={paper.arxivUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-40 hover:opacity-70 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <ArrowSquareOut size={12} style={{ color: 'var(--color-text-muted)' }} />
        </a>
      )}
      <button
        onClick={onAdd}
        disabled={selected}
        className="flex-shrink-0 p-1 rounded transition-colors disabled:opacity-30"
        style={{ color: selected ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
        title={selected ? 'Already selected' : 'Add to selection'}
      >
        <Plus size={12} />
      </button>
    </div>
  )
}

function SearchingDots() {
  return (
    <span className="flex gap-0.5 items-center h-4">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1 h-1 rounded-full"
          style={{ background: '#09090b' }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  )
}

function SearchSkeleton() {
  return (
    <div className="px-5 py-3 flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
          className="flex flex-col gap-2 py-3 border-b"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <div
            className="h-3.5 rounded-sm"
            style={{ background: 'var(--color-surface-2)', width: `${65 + (i % 3) * 10}%` }}
          />
          <div
            className="h-2.5 rounded-sm"
            style={{ background: 'var(--color-surface-2)', width: '40%' }}
          />
          <div
            className="h-2 rounded-sm"
            style={{ background: 'var(--color-surface-2)', width: '85%' }}
          />
        </motion.div>
      ))}
    </div>
  )
}

function EmptyState({ topic }: { topic: string }) {
  if (topic) return null
  return (
    <div className="flex flex-col items-start justify-center h-full px-8">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-4"
        style={{ background: 'var(--color-surface-2)' }}
      >
        <MagnifyingGlass size={16} style={{ color: 'var(--color-text-muted)' }} />
      </div>
      <h2
        className="text-sm font-semibold tracking-tight mb-1"
        style={{ color: 'var(--color-text)' }}
      >
        Search arXiv
      </h2>
      <p className="text-xs max-w-[280px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        Enter a research topic to fetch recent papers. Select papers, then generate a LaTeX survey compiled to PDF.
      </p>
    </div>
  )
}
