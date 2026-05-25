# /daily — Fetch today's arXiv digest and surface top papers

Fetch the last 24 hours of arXiv papers across configured categories, rank them against the current wiki, and present the top-N for review. Optionally auto-ingest the top picks.

## Argument hints

- `--hours N`: look back N hours (default: 24)
- `--categories <list>`: comma-separated arXiv categories (default: cs.LG,cs.CV,cs.CL,cs.AI,stat.ML)
- `--top N`: number of papers to surface (default: 5)
- `--auto-ingest`: automatically ingest papers scoring >= 7/10

## Steps

### Stage 1 — Fetch recent papers

```bash
python3 tools/fetch_arxiv.py --hours {hours} -o raw/discovered/daily-$(date +%Y-%m-%d).json
```

Or via API:
```bash
curl -s "http://localhost:3001/api/arxiv?q=*&max=50" | python3 -m json.tool
```

### Stage 2 — Score against wiki

Load `wiki/graph/context_brief.md` and all concept slugs from `wiki/concepts/`.

For each paper in today's feed, compute relevance score (0-10):
- +3 if abstract mentions a concept in your wiki by name
- +2 if an author has a page in `wiki/people/`
- +2 if the paper's arXiv category matches the primary category of your top-3 papers by importance
- +2 if the paper references any paper already in your wiki (detected by arXiv ID in abstract references)
- +1 for recency (within last 12 hours)

### Stage 3 — Rank and present

Sort by score descending. Show top-N:

```
Daily arXiv Digest — {date}
Categories: cs.LG, cs.CL, cs.AI
Found: {total} papers | Showing top {N}

[1] Score: 9/10 — Attention Mechanisms in Long Context Windows (arXiv:2401.XXXXX)
    Authors: Smith et al.
    Reason: uses 3 of your concepts (attention, transformer, kv-cache) + author Wang Fei is in your wiki
    → /ingest 2401-XXXXX to add this

[2] Score: 7/10 — ...
...

Run /daily --auto-ingest to ingest top-3 automatically.
```

### Stage 4 — Auto-ingest (if --auto-ingest or user confirms)

For papers with score >= 7 (or user-selected), run `/ingest` workflow for each.

### Stage 5 — Log

```bash
python3 tools/research_wiki.py log wiki/ "daily | {date} | fetched: {total} | surfaced: {N} | ingested: {ingested}"
```

## Output

- `raw/discovered/daily-{date}.json` — raw feed
- Console: ranked digest
- Optionally: new paper entities in `wiki/papers/`
