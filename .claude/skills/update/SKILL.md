# /update — Revise wiki pages when knowledge changes

Update one or more entity pages because new information arrived, a prior claim was wrong, or a source was corrected. Always show diffs before writing. Always log. Always cite the source of every change.

## Argument hints

- `<slug>` (optional): specific entity page to update (e.g. `papers/attention-2017`)
- `--from <url|file>`: new source driving the update
- `--lint-report <slug>`: work through a `/check` report item by item
- `--sweep`: after updating the primary page, scan all pages for the same stale claim

---

## Steps

### Stage 1 — Identify what to update

The user may provide:
- **Specific entity slug** — update that page only (then sweep if `--sweep`)
- **New information** — read `wiki/index.md` to find affected pages, then read those pages
- **A check report** (`--lint-report`) — work through its 🔴/🟡 items one by one

If `--from` is provided, fetch and read the source now:
```bash
curl -s -X POST http://localhost:3001/api/raw/fetch \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"{url}\",\"type\":\"web\"}"
```

### Stage 2 — For each page to update, propose the change

Read the current page content in full. For each change needed, show:

```
Page: wiki/{kind}/{slug}.md

Current:
  "{existing text}"

Proposed:
  "{replacement text}"

Reason: {why this change is warranted}
Source: {URL, file path, or description — REQUIRED}
```

**Always include Source.** An edit without a source is untraceably wrong. If you cannot cite a source, say so explicitly rather than writing unsourced edits.

Ask for confirmation **per page**. Never batch-apply across pages without individual confirmation.

### Stage 3 — Check for downstream effects

After identifying the primary pages to update, scan all entity pages for `[[{updated-slug}]]` references.

For each page that links to an updated page:
- Does the update change any claim that page makes?
- If yes: flag it — "[[other-page]] may also need updating based on this change"
- Offer to update it with the same confirm-before-write flow

### Stage 4 — Contradiction sweep

If the new information contradicts something in the wiki, grep all entity pages for the contradicted claim — it may appear in more than one page. Update all occurrences.

```bash
grep -r "{old claim fragment}" wiki/
```

Do not update only the most obvious page and leave the contradiction alive elsewhere.

### Stage 5 — Update edges if needed

If the update changes relationships between entities, update `wiki/graph/edges.jsonl`:
- If a prior `improves_on` edge is now wrong (paper retracted), remove or annotate it
- If new information introduces a `challenges` or `contradicts` edge, add it:

```bash
python3 tools/research_wiki.py add-edge wiki/ \
  --from papers/{slug} --to papers/{other-slug} \
  --type challenges \
  --evidence "{brief reason}" --confidence high
```

### Stage 6 — Update wiki/graph/overview.md

Re-read `wiki/graph/overview.md`. If the update shifts the overall synthesis — resolves an open question, changes a key claim, corrects a misconception — propose edits using the same confirm-before-write flow.

### Stage 7 — Rebuild derived files

```bash
python3 tools/research_wiki.py rebuild-index wiki/
python3 tools/research_wiki.py rebuild-context-brief wiki/
python3 tools/lint.py wiki/
```

### Stage 8 — Log

```bash
python3 tools/research_wiki.py log wiki/ "update | pages: {list} | reason: {brief} | source: {url-or-description}"
```

## Common Mistakes

- **Updating without citing the source** — every change must have a `Source:` line. This makes the wiki auditable.
- **Skipping the downstream check** — updating one page while leaving linked pages with stale claims creates silent inconsistency.
- **Appending instead of editing in-place** — do NOT add `## [date] update` headers to page bodies. Edit the relevant section in-place, bump the `updated` frontmatter date, and record the change only in `wiki/log.md`.
- **Batch-writing without per-page confirmation** — show each diff individually.

## Output

- Updated entity pages (diffs shown before each write)
- Updated `wiki/graph/edges.jsonl` if relationships changed
- `wiki/graph/overview.md` updated if synthesis shifted
- `wiki/index.md` and `wiki/graph/context_brief.md` rebuilt
- Log appended
