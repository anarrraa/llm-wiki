# /check — Wiki structural health check

Run a full audit across the wiki. Produce a severity-tiered report. Offer concrete fixes. Log the operation.

## Argument hints

- `--fix`: auto-fix safe issues (broken edges, stale index, missing overview sections)
- `--strict`: also run stale-claims and contradiction checks (slower, reads all pages)

---

## Steps

### Stage 1 — Build page inventory

Read `wiki/index.md` and all files in `wiki/{papers,concepts,topics,ideas,experiments,methods,people,foundations,Summary}/`.

Build a map of:
- All existing entity slugs (filename without `.md`)
- All `[[slug]]` wikilinks found in any page body
- All `from`/`to` slugs in `wiki/graph/edges.jsonl`
- All `from`/`to` slugs in `wiki/graph/citations.jsonl`

### Stage 2 — Run all checks

**🔴 Errors — must fix**

1. **Entity frontmatter** — every `.md` has required fields per `runtime/schema/entities.yaml` (kind, title, slug, status)
2. **Invalid status** — `status` value not in lifecycle enum for its entity kind
3. **Broken edge endpoints** — `from`/`to` in `edges.jsonl` or `citations.jsonl` reference entities that have no file
4. **Broken wikilinks** — `[[slug]]` in page body that has no matching entity file

**🟡 Warnings — should fix**

5. **Orphan entities** — entity pages with zero inbound wikilinks from any other page (excluding `index.md`)
6. **Missing xref** — forward link exists but required reverse link is absent per `runtime/schema/xref.yaml`
7. **Slug mismatch** — file slug in frontmatter doesn't match filename
8. **Stale claims** (`--strict` only) — pages not updated in 90 days that contain "current", "latest", "state-of-the-art", or year literals two or more years old
9. **Contradictions** (`--strict` only) — same entity described with different values in two different pages (dates, counts, names, relationships)
10. **Chronological update sections** — page bodies with date-stamped headers like `## April 2025` or `**Update:**` that should be integrated in-place

**🔵 Info — consider addressing**

11. **Index freshness** — `wiki/index.md` entity count doesn't match actual file count per kind
12. **Orphan experiments** — experiments with no `linked_idea`
13. **Coverage gaps** — open questions in `wiki/graph/open_questions.md` with no linked idea addressing them
14. **LaTeX artefacts** — stale `.aux`, `.log`, `.out` files in `public/output/`

### Stage 3 — Write the health report

Write `wiki/Summary/check-{today}.md`:

```markdown
---
kind: Summary
title: "Wiki Health Check {today}"
slug: check-{today}
status: published
scope: health
date_generated: {today}
---

## Scope

Health audit run on {today}. {N} entity pages across {K} kinds.

## Key Findings

- 🔴 Errors: {N}
- 🟡 Warnings: {N}
- 🔵 Info: {N}

## 🔴 Errors

### Broken edge endpoints
- edges.jsonl:{line} — "to" entity papers/old-slug does not exist
  Fix: delete the edge or create the missing entity

### Invalid status
- wiki/ideas/my-idea.md — status "active" not valid for ideas (must be: proposed/in_progress/tested/validated/failed/abandoned)

## 🟡 Warnings

### Orphan entities
- [[slug]] — no inbound wikilinks
  Fix: link from a related page, or mark status: abandoned

### Missing xref
- wiki/ideas/foo.md lists concept bar in origin_gaps but wiki/concepts/bar.md has no linked_ideas entry for foo
  Fix: add foo to bar.md linked_ideas frontmatter

### Stale claims
- [[page]] last updated {date}, contains "latest" or "current"
  Fix: re-verify or add "as of {date}" qualifier

### Contradictions
- [[page-a]] says "{claim-a}"
  [[page-b]] says "{claim-b}" (same entity, different value)
  Recommendation: {which to trust}

## 🔵 Info

### Index freshness
- index.md shows 12 papers but 14 files exist
  Fix: run `python3 tools/research_wiki.py rebuild-index wiki/`

### Coverage gaps
- open_questions.md lists "{question}" — no linked idea addresses it
  Suggestion: run /ideate
```

Add the report to `wiki/index.md` under a Maintenance category.

### Stage 4 — Offer concrete fixes

For each category, offer one action at a time:

- 🔴 **Broken edges:** "Remove broken entries from edges.jsonl? (I'll backup first to raw/tmp/)"
- 🟡 **Missing xref:** "Add the missing reverse links?"
- 🟡 **Stale claims:** "Add 'as of {date}' qualifiers to these pages?"
- 🔵 **Index freshness:** "Rebuild index and context_brief now?"
- 🔵 **LaTeX artefacts:** "Clean public/output/ of stale files?"

Show exact diff before each write. Apply only after confirmation.

Auto-fix (`--fix` flag) applies safe changes without prompting: index rebuild, context_brief rebuild, broken edge removal (with backup).

### Stage 5 — Validate

```bash
python3 tools/lint.py wiki/
```

### Stage 6 — Log

```bash
python3 tools/research_wiki.py log wiki/ "check | errors: {R} | warnings: {Y} | info: {B} | fixed: {list}"
```

## Output

- `wiki/Summary/check-{today}.md` — severity-tiered health report
- Console summary: "🔴 2 errors · 🟡 5 warnings · 🔵 3 info"
- Optionally: auto-repaired wiki with backups
