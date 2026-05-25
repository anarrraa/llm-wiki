# llm-wiki

LaTeX research agent built with Next.js 16, TypeScript, Tailwind v4.

## Stack
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4 (@tailwindcss/postcss)
- Zustand (state), React Query (server state)
- Framer Motion (animations), @phosphor-icons/react
- @anthropic-ai/sdk (Claude for LaTeX generation)
- fast-xml-parser (arXiv Atom feed parsing)

## Key flows
1. **Search**: `GET /api/arxiv?q=topic` → fetches arXiv Atom API
2. **Generate**: `POST /api/latex/generate` → streams LaTeX from Claude API
3. **Compile**: `POST /api/latex/compile` → runs pdflatex, writes to `public/output/`
4. **Wiki save**: `POST /api/wiki` → writes paper as `wiki/papers/{slug}.md`
5. **Raw fetch**: `POST /api/raw/fetch` → saves web/pdf to `raw/web/` or `raw/papers/`

## Wiki structure (mirrors OmegaWiki)
```
wiki/
  papers/     — one .md per paper
  concepts/   — extracted concepts
  topics/     — research topics
  ideas/      — novel ideas
  experiments/
  methods/
  people/
  foundations/
  graph/
    edges.jsonl        — semantic edges
    citations.jsonl    — bibliographic edges
  index.md    — catalog
  log.md      — append-only audit log

raw/
  papers/     — user-owned PDFs (read-only to skills)
  notes/      — user notes
  web/        — fetched web content
  discovered/ — skill-writable
  tmp/        — scratch
```

## Commands
```bash
npm run dev      # start dev server
npm run build    # production build
```

## LaTeX
pdflatex at `/usr/local/texlive/2026basic/bin/universal-darwin/pdflatex`
Set PDFLATEX_PATH env var to override.

## MCP
`.mcp.json` has `@modelcontextprotocol/server-fetch` — enables Claude Code to
fetch web pages and PDFs directly as raw data into the wiki.
