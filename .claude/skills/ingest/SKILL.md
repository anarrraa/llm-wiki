# /ingest — Promote a raw paper into a fully wired wiki page

Read a paper, surface takeaways for the user BEFORE writing anything, then create a complete typed entity page with concepts, methods, people, edges, and bidirectional backlinks.

## Argument hints

- `<slug|arxiv-id>` (optional): arXiv ID or existing wiki slug to ingest
- `--url <url>`: fetch and ingest directly from a URL
- `--all`: ingest everything in `raw/discovered/` not yet ingested
- `--importance N`: override importance rating (0-3, default: 1)

## Prerequisites

Paper must exist in `raw/discovered/` as JSON, or in `raw/papers/` as PDF, or reachable via `--url`.

---

## Steps

### Stage 1 — Source the paper

If `--url` provided:
```bash
curl -s -X POST http://localhost:3001/api/raw/fetch \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"{url}\",\"type\":\"paper\"}"
```

Read the fetched content in full. For arXiv JSON in `raw/discovered/`, read the entry directly.

### Stage 2 — Surface takeaways BEFORE writing anything

Tell the user:
- 3-5 key takeaways from the paper
- What new concepts or methods this introduces
- Whether it contradicts or updates anything already in the wiki (read `wiki/graph/context_brief.md` to check)
- Suggested importance score (0-3) and contribution_type

Ask: **"Anything specific you want me to emphasise, de-emphasise, or skip?"**

Wait for the user's response before proceeding to write any file.

### Stage 3 — Generate slug

```bash
python3 tools/research_wiki.py slug "{title}"
# For arXiv: use arXiv ID with / replaced by - (e.g. 2301-00234)
```

### Stage 4 — Create the paper entity page

Read `runtime/templates/papers.md.tmpl`.
Fill every frontmatter field per `runtime/schema/entities.yaml`.

Write `wiki/papers/{slug}.md`:
- YAML frontmatter: kind, title, slug, status: ingested, arxiv_id, arxiv_url, authors, category, published, added, importance, tldr, contribution_type
- Body: all sections filled — Abstract, Problem & Context, Key Idea, Method, Experiments & Results, Limitations, Open Questions, My Take, Related, Notes

**Every non-obvious factual claim in the body must cite the source.** Use inline `[[slug]]` links for wiki cross-references and inline `(arXiv:XXXX)` for external sources.

### Stage 5 — Extract concepts

Identify 2–5 new or existing concepts. For each:

Check if `wiki/concepts/{concept-slug}.md` exists.

If **new**: create from `runtime/templates/concepts.md.tmpl`, fill definition and first `key_papers` entry.

If **existing**: add this paper's slug to the `key_papers` frontmatter list and update the `Definition` or `Key Variants` body section if the paper adds meaningful nuance.

Write edge:
```bash
python3 tools/research_wiki.py add-edge wiki/ \
  --from papers/{slug} --to concepts/{concept-slug} \
  --type uses_concept \
  --evidence "{brief quote}" --confidence medium
```

### Stage 6 — Extract methods (if applicable)

If the paper introduces or heavily uses a named method/architecture, create or update `wiki/methods/{method-slug}.md`.

```bash
python3 tools/research_wiki.py add-edge wiki/ \
  --from papers/{slug} --to methods/{method-slug} \
  --type implements --confidence high
```

### Stage 7 — Create people pages

For the first author and any people already in `wiki/people/`, check or create `wiki/people/{name-slug}.md`. Add the `authored_by` edge.

### Stage 8 — Add citations

For known references in the paper:
```bash
echo '{"from":"papers/{slug}","to":"papers/{cited-slug}","type":"cites","source":"manual","confirmed":false}' >> wiki/graph/citations.jsonl
```

Mark `confirmed: false` until verified. See `.claude/skills/shared-references/citation-verification.md`.

### Stage 9 — Backlink audit — do not skip

Scan ALL existing pages in `wiki/papers/`, `wiki/concepts/`, `wiki/topics/` for any that mention this paper's concepts, methods, or authors but don't yet cross-link to the new page.

Add `[[new-slug]]` wiki-links where appropriate. This is the step most commonly skipped — a compounding wiki's value comes from bidirectional links.

### Stage 10 — Update wiki/graph/overview.md

Read the current `wiki/graph/overview.md`. If this paper:
- Introduces a significant concept: add it to "Key Concepts"
- Shifts the current understanding of a topic: update "Current Understanding"
- Raises a new open question: add it to "Open Questions"
- Belongs to a topic gap: note it

Update the `updated` date.

### Stage 11 — Rebuild derived files

```bash
python3 tools/research_wiki.py rebuild-index wiki/
python3 tools/research_wiki.py rebuild-context-brief wiki/
```

### Stage 12 — Validate & log

```bash
python3 tools/lint.py wiki/
python3 tools/research_wiki.py log wiki/ "ingest | paper: {slug} | importance: {N} | concepts: {list} | methods: {list}"
```

## Common Mistakes

- **Writing before surfacing takeaways** — Always run Stage 2 and wait for user input first.
- **Skipping the backlink audit (Stage 9)** — Wiki value compounds through bidirectional links.
- **Appending dated sections to existing pages** — Edit relevant sections in-place and update the `updated` date. Dated update headers belong in `wiki/log.md`, not page bodies.
- **Leaving all citations as unconfirmed** — Confirm at least the primary papers before moving on.

## Output

- `wiki/papers/{slug}.md`
- `wiki/concepts/{slug}.md` (new/updated)
- `wiki/methods/{slug}.md` (if applicable)
- `wiki/people/{slug}.md` (for authors)
- Edges appended to `wiki/graph/edges.jsonl`
- Citations appended to `wiki/graph/citations.jsonl`
- `wiki/graph/overview.md` updated
- `wiki/index.md` and `wiki/graph/context_brief.md` rebuilt
