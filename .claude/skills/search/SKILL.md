# /search — Fetch papers from arXiv and web for a research topic

Search arXiv for recent papers on a topic, optionally fetch web sources, and write results to `raw/discovered/` for later ingestion.

## Argument hints

- `<topic>` (required): the research topic or query string, e.g. `transformer attention mechanisms`
- `--max N`: number of papers to fetch (default: 20, max: 50)
- `--hours N`: restrict to papers published in last N hours (default: all)
- `--web <url>`: also fetch a specific web page or PDF into `raw/web/`
- `--s2`: also query Semantic Scholar (requires `S2_API_KEY` in `.env`)

## Prerequisites

- `npm run dev` must be running (port 3000)
- Or arXiv can be queried directly via `python3 tools/fetch_arxiv.py`

## Steps

### Stage 1 — Query arXiv

```bash
# Via the app API
curl -s "http://localhost:3001/api/arxiv?q={topic}&max={N}" | python3 -m json.tool

# Or directly (no server needed)
python3 tools/fetch_arxiv.py --hours 168 -o raw/discovered/{slug}-arxiv.json
```

Save the JSON to `raw/discovered/{topic-slug}-{date}.json`.

### Stage 2 — Optional web fetch

If the user passed `--web <url>`, fetch and save:

```bash
curl -s -X POST http://localhost:3001/api/raw/fetch \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"{url}\",\"type\":\"web\"}"
```

### Stage 3 — Optional Semantic Scholar

If `--s2` flag and `S2_API_KEY` set:

```bash
python3 tools/fetch_s2.py --query "{topic}" -o raw/discovered/{slug}-s2.json
```

### Stage 4 — Present results

Read `raw/discovered/*.json`, display a numbered list of papers with title, authors, year, category.

Ask: "Which papers do you want to ingest? (numbers, 'all', or 'none')"

If user answers, proceed to run `/ingest` on each selected paper.

### Stage 5 — Log

```bash
python3 tools/research_wiki.py log wiki/ "search | topic: {topic} | found: {N} papers | saved: raw/discovered/{filename}"
```

## Output

- `raw/discovered/{topic-slug}-{date}.json` — raw arXiv/S2 hits
- `raw/web/{url-slug}.html` (if --web used)
- Console list of found papers ready for `/ingest`
