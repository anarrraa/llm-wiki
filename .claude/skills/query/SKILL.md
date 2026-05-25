# /query — Ask a question against your wiki; optionally save the answer back

Read the wiki, synthesise an answer with wiki citations, and offer to file it as a new page. Never answer from general knowledge — the wiki is the source of truth.

## Argument hints

- `<question>` (required): the question to ask, e.g. "What do we know about sparse attention?"
- `--save`: automatically save the answer as a wiki page without prompting
- `--kind <Summary|concepts|topics|ideas>`: entity kind for the saved page (default: Summary)

---

## Steps

### Stage 1 — Read `wiki/index.md` first

Scan the full index to identify which entity pages are likely relevant. Do NOT answer from general knowledge — even if you think you know the answer, the wiki may contradict or refine it. That signal is valuable.

### Stage 2 — Read relevant pages

Read the identified pages in full. Follow one level of `[[slug]]` links if those pages seem relevant to the question. Also read `wiki/graph/context_brief.md` and `wiki/graph/open_questions.md`.

### Stage 3 — Synthesise the answer

Write a response that:
- Is grounded in wiki pages (not training knowledge)
- Cites inline using `[[slug]]` for every claim sourced from a specific page
- Notes agreements and tensions between pages
- Flags gaps: "The wiki has no page on X" or "[[page]] doesn't cover Y yet"
- Suggests which papers to ingest or which `/ideate` direction could fill the gap

Format for question type:
- Factual → prose with [[citations]]
- Comparison → table with one column per entity
- How-it-works → numbered steps
- What-do-we-know-about-X → structured summary with open questions at the end

### Stage 4 — Offer to save

After answering, say:

> "Worth saving as `wiki/Summary/{suggested-slug}.md`?"

If **yes** (or `--save` flag):

Generate the slug:
```bash
python3 tools/research_wiki.py slug "{question summary}"
```

Create `wiki/Summary/{slug}.md` from `runtime/templates/Summary.md.tmpl`:
```yaml
kind: Summary
title: "{question as title}"
slug: {slug}
status: published
scope: "{question}"
key_topics: [list of slug references]
date_generated: {today}
```

Body: the full synthesised answer, with `[[slug]]` links preserved.

Add to `wiki/index.md` under the correct category. Rebuild:
```bash
python3 tools/research_wiki.py rebuild-index wiki/
```

Log:
```bash
python3 tools/research_wiki.py log wiki/ "query | question: {question} | filed as: {slug}"
```

If **no**:
```bash
python3 tools/research_wiki.py log wiki/ "query | question: {question} | not filed"
```

## Common Mistakes

- **Answering from memory** — Always read the wiki pages first. The wiki may have a nuance your training does not.
- **Skipping the save offer** — Good query answers compound the wiki's value.
- **No citations** — Every factual claim in the answer should trace to a `[[slug]]`.
- **One-liner answers** — If the wiki has depth on this topic, the answer should reflect it.

## Output

- Console: synthesised answer with [[wiki citations]]
- Optionally: `wiki/Summary/{slug}.md` + `wiki/index.md` updated + log appended
