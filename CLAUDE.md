# CLAUDE.md — llm-wiki Research Agent

## What this repo is

A LaTeX-first research platform. You enter a topic, build a typed knowledge graph of papers/concepts/ideas, then produce a compiled PDF survey or paper in one flow.

**Skill lifecycle:**
`/search` → `/ingest` → `/discover` → `/ideate` → `/survey` → `/draft` → `/compile` → `/review`

---

## Stack & Commands

```bash
# Start the web app (required for /compile and /survey via API)
npm run dev -- -p 3001   # → http://localhost:3001  (port 3000 used by other services)

# Validate wiki structure (run after any wiki edit)
python3 tools/lint.py wiki/

# Directly call the research engine
python3 tools/research_wiki.py --help
python3 tools/research_wiki.py stats wiki/
python3 tools/research_wiki.py slug "My Paper Title"
python3 tools/research_wiki.py log wiki/ "action | detail"
python3 tools/research_wiki.py rebuild-index wiki/

# LaTeX compilation (via API or direct)
curl -s -X POST http://localhost:3000/api/latex/compile \
  -H "Content-Type: application/json" \
  -d '{"content":"...","filename":"draft"}' | python3 -m json.tool

# ArXiv search
curl "http://localhost:3000/api/arxiv?q=transformers&max=10"

# Web fetch into raw/
curl -s -X POST http://localhost:3000/api/raw/fetch \
  -H "Content-Type: application/json" \
  -d '{"url":"https://arxiv.org/abs/2301.00234","type":"paper"}'
```

---

## Skill Catalog

| Skill | Trigger | What it does |
|---|---|---|
| `/search` | `\search <topic>` | Search arXiv + web for papers; writes to `raw/discovered/` |
| `/ingest` | `\ingest [slug\|url\|--all]` | Surface takeaways first, then full wiki page + edges + backlink audit |
| `/discover` | `\discover` | Ranked related-paper recommendations from wiki context |
| `/survey` | `\survey <topic>` | Generate LaTeX literature review; compile to PDF |
| `/draft` | `\draft <idea_slug>` | Write full LaTeX paper from an idea + evidence |
| `/compile` | `\compile [filename]` | Compile LaTeX source → PDF with auto-fix loop |
| `/review` | `\review [--audit]` | Writing review + two-phase parallel citation audit |
| `/query` | `\query <question>` | Ask a question; wiki answers with [[citations]]; optionally save back |
| `/update` | `\update <slug>` | Revise wiki pages; diff-before-write + downstream contradiction sweep |
| `/ideate` | `\ideate` | Generate novel research ideas from wiki gaps |
| `/cite` | `\cite <slug\|url>` | Fetch BibTeX, verify, add to citations.jsonl |
| `/prefill` | `\prefill <domain>` | Seed wiki/foundations/ with domain background |
| `/fetch` | `\fetch <url>` | Download web page or PDF into raw/web/ or raw/papers/ |
| `/check` | `\check [--strict]` | 🔴🟡🔵 severity-tiered health report + auto-fix |
| `/daily` | `\daily` | Fetch today's arXiv digest; auto-ingest top-N |

---

## Architecture (4 layers)

1. **`raw/`** — Intake zone. `raw/{papers,notes,web}/` are user-owned, read-only to skills. `raw/discovered/` and `raw/tmp/` are skill-writable scratch.

2. **`wiki/`** — The typed knowledge graph. One `.md` per entity, YAML frontmatter validated against `runtime/schema/entities.yaml`. Cross-entity edges in `wiki/graph/edges.jsonl`; citations in `wiki/graph/citations.jsonl`. Derived files (`context_brief.md`, `open_questions.md`, `index.md`) are auto-generated — never hand-edit.

3. **`runtime/`** — The contract. Four YAML files define what's structurally legal. `runtime/loader.py` is the access API.

4. **`tools/`** — Deterministic Python helpers. `research_wiki.py` is the graph engine. `lint.py` validates structure. `fetch_arxiv.py`, `fetch_s2.py` are source adapters.

5. **`app/`** — Next.js frontend + API routes for arXiv search, LaTeX generation (Claude), pdflatex compilation, wiki CRUD.

---

## Wiki Directory

```
wiki/
  papers/       — one .md per paper ingested
  concepts/     — extracted concepts and definitions
  topics/       — research topic nodes (broad)
  ideas/        — novel research ideas (lifecycle: proposed → validated/failed)
  experiments/  — experiment records
  methods/      — technique/algorithm nodes
  people/       — researcher profiles
  foundations/  — domain background (terminal nodes)
  graph/
    edges.jsonl        — semantic edges (typed, confidence-rated)
    citations.jsonl    — bibliographic citations
    context_brief.md   — auto-generated graph summary
    open_questions.md  — auto-generated open problem list
  index.md      — catalog (rebuilt by /check)
  log.md        — append-only audit history

raw/
  papers/     — user PDFs (read-only to skills)
  notes/      — user notes (read-only to skills)
  web/        — fetched web pages
  discovered/ — skill-writable (arXiv JSON, S2 hits)
  tmp/        — scratch
```

---

## Hard Rules

1. `raw/{papers,notes,web}` are user-owned. Skills append only to `raw/discovered/` or `raw/tmp/`.
2. `wiki/graph/` is derived. Only modify via `tools/research_wiki.py` subcommands.
3. `wiki/log.md` is append-only. Append via `python3 tools/research_wiki.py log wiki/ "message"`.
4. Forward link → write reverse simultaneously. Rules in `runtime/schema/xref.yaml`.
5. Every wiki write must be validated: `python3 tools/lint.py wiki/` after batch edits.
6. **Never** delete a failed idea or invalidated method — mark lifecycle instead. Knowledge compounds.
7. Citation placeholders use `[UNCONFIRMED]` tag until BibTeX is verified.

---

## Key Invariants

- **Slugs**: lowercase, hyphen-separated, no spaces: `^[a-z0-9]+(-[a-z0-9]+)*$`
- **Entity path**: `wiki/{kind}/{slug}.md`
- **Log format**: `- \`{ISO-8601}\` {skill} | {action} | {detail}`
- **Bidirectional links**: every forward edge requires simultaneous reverse write
- **LaTeX output**: PDFs land in `public/output/{filename}.pdf`, served at `/output/{filename}.pdf`
- **pdflatex path**: `/usr/local/texlive/2026basic/bin/universal-darwin/pdflatex` (or `$PDFLATEX_PATH`)

---

## Where to Look

| Need | File |
|---|---|
| Entity frontmatter fields, enums, lifecycle | `runtime/schema/entities.yaml` |
| Page body section structure | `runtime/templates/{kind}.md.tmpl` |
| Edge types, attributes, direction | `runtime/schema/edges.yaml` |
| Forward → reverse link rules | `runtime/schema/xref.yaml` |
| Slug rule, ownership zones | `runtime/schema/conventions.yaml` |
| Field write permissions per skill | `runtime/policy/writers.yaml` |
| Changing the contract | `runtime/CLAUDE.md` |
| Writing standards | `.claude/skills/shared-references/academic-writing.md` |
| Citation verification | `.claude/skills/shared-references/citation-verification.md` |
