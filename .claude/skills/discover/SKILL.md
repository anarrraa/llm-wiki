# /discover — Find related papers from wiki context

Recommend papers not yet in the wiki that are most relevant to the current knowledge graph state. Uses arXiv and optionally Semantic Scholar.

## Argument hints

- `--anchor <slug>`: centre recommendations around a specific paper or concept
- `--topic <string>`: free-text topic filter
- `--max N`: maximum recommendations (default: 10)
- `--mode <wiki|venue|author>`: ranking mode (default: wiki — uses graph neighbours)

## Prerequisites

- At least 3 papers ingested in wiki
- `npm run dev` running

## Steps

### Stage 1 — Build query from wiki context

Read `wiki/graph/context_brief.md` for the current knowledge state.

If `--anchor` provided, read `wiki/{kind}/{slug}.md` and extract its key concepts, methods, and related papers.

Build a search query from:
- The 3 most-cited concepts in `edges.jsonl` for this anchor
- The top-2 papers by importance near the anchor
- The topic string (if provided)

### Stage 2 — Query arXiv

```bash
curl -s "http://localhost:3001/api/arxiv?q={query}&max=30"
```

### Stage 3 — Filter out already-ingested papers

Load all slugs from `wiki/papers/`. Remove any arXiv hit whose arXiv ID matches an ingested paper.

### Stage 4 — Rank by relevance

Score each candidate paper (0-10) based on:
- Concept overlap with current wiki (how many wiki concepts appear in the abstract)
- Author overlap (do any wiki people appear as authors)
- Citation overlap (does the paper reference any ingested papers in its references)
- Recency (prefer papers published within last 6 months)

### Stage 5 — Present ranked list

Display top-N papers as a numbered list:
```
[1] Paper Title (arXiv:XXXX) — relevance: 8/10
    Authors: ...
    Why: shares 3 concepts (attention, transformer, fine-tuning) with your wiki
[2] ...
```

Ask: "Which papers do you want to ingest? (numbers, 'all', or skip)"

If user responds, run `/ingest` on selected papers.

### Stage 6 — Log

```bash
python3 tools/research_wiki.py log wiki/ "discover | query: {query} | candidates: {N} | selected: {list}"
```

## Output

- Console: ranked list of recommended papers
- `raw/discovered/{query-slug}-discover.json` — full candidate list saved for reference
