# /survey — Generate a LaTeX literature survey and compile to PDF

Take a topic and selected wiki papers, generate a complete LaTeX survey document via Claude, compile with pdflatex, and open the PDF.

## Argument hints

- `<topic>` (required): research topic to survey
- `--papers <slug,...>`: comma-separated list of paper slugs to include (default: all ingested papers matching the topic)
- `--style <survey|review|tutorial>`: document style (default: survey)
- `--max-papers N`: cap number of papers to include (default: 15)
- `--filename <name>`: output filename without extension (default: survey)

## Prerequisites

- `npm run dev` running on port 3000
- `ANTHROPIC_API_KEY` set in `.env`
- At least 3 papers ingested in `wiki/papers/`

## Steps

### Stage 1 — Gather wiki context

Read `wiki/graph/context_brief.md` for the knowledge graph summary.

Query relevant papers:
```bash
python3 tools/research_wiki.py find wiki/ papers --field status ingested
```

If `--papers` provided, use only those slugs. Otherwise select papers most relevant to `<topic>` by reading their `tldr` and `category` frontmatter fields.

### Stage 2 — Build survey prompt

Read selected paper pages from `wiki/papers/{slug}.md`. For each, extract:
- title, authors, year, contribution_type, tldr, key idea, method summary

### Stage 3 — Generate LaTeX via streaming API

```bash
curl -s -X POST http://localhost:3001/api/latex/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "{topic}",
    "papers": [{title, abstract, authors, arxivId, category, published}, ...]
  }'
```

Stream the response into `latex/output/{filename}.tex`. Show progress as LaTeX accumulates.

### Stage 4 — Review generated LaTeX

Scan the output for obvious issues:
- Missing `\documentclass`
- Unclosed environments (`\begin` without `\end`)
- `\cite{}` references that are not in the bibliography
- `\ref{}` calls with no matching `\label{}`

Auto-fix simple issues in place.

### Stage 5 — Compile to PDF

```bash
curl -s -X POST http://localhost:3001/api/latex/compile \
  -H "Content-Type: application/json" \
  -d '{"content":"{latex}","filename":"{filename}"}'
```

If compilation fails, read the error log, fix the specific error(s), and retry (max 3 attempts).

Common fixes:
- Missing package → add `\usepackage{...}` to preamble
- Undefined citation → add `\bibitem` or remove `\cite`
- Overfull hbox → wrap long lines

### Stage 6 — Write Summary entity

Create `wiki/Summary/{topic-slug}.md` from `runtime/templates/Summary.md.tmpl`:
- frontmatter: kind, title, slug, status: published, scope, key_topics, date_generated
- Body: distill key findings and themes from the survey

### Stage 7 — Log

```bash
python3 tools/research_wiki.py log wiki/ "survey | topic: {topic} | papers: {N} | output: public/output/{filename}.pdf"
```

## Output

- `latex/output/{filename}.tex` — generated LaTeX source
- `public/output/{filename}.pdf` — compiled PDF (served at `/output/{filename}.pdf`)
- `wiki/Summary/{topic-slug}.md` — summary entity
- Confirm PDF path and open suggestion to user
