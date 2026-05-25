'use client'

import { create } from 'zustand'

export interface Paper {
  id: string
  title: string
  abstract: string
  authors: string[]
  arxivUrl: string
  arxivId: string
  category: string
  published: string
  citationCount?: number
  source?: 'arXiv' | 'S2'
}

export interface WikiStats {
  papers: number
  concepts: number
  topics: number
  ideas: number
  experiments: number
  methods: number
  people: number
  foundations: number
}

export interface Facets {
  year: string
  field: string
  minCitations: number
  wikiQuery: string
}

type Status = 'idle' | 'searching' | 'generating' | 'compiling' | 'done' | 'error'

interface ResearchStore {
  topic: string
  papers: Paper[]
  s2Papers: Paper[]
  facets: Facets
  selectedIds: Set<string>
  latexContent: string
  pdfUrl: string | null
  status: Status
  error: string | null
  wikiStats: WikiStats | null
  activeTab: 'source' | 'preview'

  setTopic: (topic: string) => void
  setPapers: (papers: Paper[]) => void
  setS2Papers: (papers: Paper[]) => void
  setFacets: (facets: Partial<Facets>) => void
  toggleSelect: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
  setLatex: (content: string) => void
  setPdfUrl: (url: string | null) => void
  setStatus: (status: Status) => void
  setError: (error: string | null) => void
  setWikiStats: (stats: WikiStats) => void
  setActiveTab: (tab: 'source' | 'preview') => void
}

export const useResearchStore = create<ResearchStore>((set, get) => ({
  topic: '',
  papers: [],
  s2Papers: [],
  facets: { year: '', field: '', minCitations: 0, wikiQuery: '' },
  selectedIds: new Set(),
  latexContent: '',
  pdfUrl: null,
  status: 'idle',
  error: null,
  wikiStats: null,
  activeTab: 'source',

  setTopic: (topic) => set({ topic }),
  setPapers: (papers) => set({ papers }),
  setS2Papers: (s2Papers) => set({ s2Papers }),
  setFacets: (facets) => set((state) => ({ facets: { ...state.facets, ...facets } })),

  toggleSelect: (id) => {
    const ids = new Set(get().selectedIds)
    ids.has(id) ? ids.delete(id) : ids.add(id)
    set({ selectedIds: ids })
  },

  selectAll: () => {
    set({ selectedIds: new Set(get().papers.map((p) => p.id)) })
  },

  clearSelection: () => set({ selectedIds: new Set() }),

  setLatex: (latexContent) => set({ latexContent }),
  setPdfUrl: (pdfUrl) => set({ pdfUrl }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setWikiStats: (wikiStats) => set({ wikiStats }),
  setActiveTab: (activeTab) => set({ activeTab }),
}))
