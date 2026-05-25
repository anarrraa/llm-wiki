# /draft — Write a full LaTeX research paper from a wiki idea

Take a validated idea from the wiki, gather supporting evidence, and produce a submission-ready LaTeX paper.

## Argument hints

- `<idea_slug>` (required): slug of a `wiki/ideas/{slug}.md` entity
- `--venue <name>`: target venue (overrides idea.target_venue)
- `--filename <name>`: output filename (default: uses idea slug)
- `--sections <list>`: comma-separated sections to include (default: full paper)

## Prerequisites

- Idea must exist in `wiki/ideas/` with status `validated` or `in_progress`
- At least 5 related papers ingested
- `npm run dev` running, `ANTHROPIC_API_KEY` set

## Steps

### Stage 1 — Read the idea

Read `wiki/ideas/{idea_slug}.md` fully. Extract:
- Hypothesis
- Approach sketch
- Novelty argument
- Target venue
- Linked experiments (from `linked_experiments` frontmatter)
- Linked papers (from `inspired_by` edges in `edges.jsonl`)

### Stage 2 — Gather evidence from wiki

```bash
python3 tools/research_wiki.py compile-context wiki/ --for paper
```

Read experiment results from `wiki/experiments/` entities linked to this idea.
Read the concept pages for all concepts in `origin_gaps`.

### Stage 3 — Generate paper structure

Before writing LaTeX, produce an outline:

```
Title: ...
Abstract (draft): ...
1. Introduction — motivation, contributions (bullet list)
2. Related Work — organised by sub-topic
3. Method — [idea approach sketch]
4. Experiments — [linked experiment results]
5. Discussion
6. Conclusion
```

Confirm outline with user if interactive, or proceed automatically.

### Stage 4 — Write LaTeX sections

Generate each section of the paper, following standards in `.claude/skills/shared-references/academic-writing.md`.

Key rules:
- Use `\cite{arxiv-XXXXXXX}` for every factual claim that came from a paper in the wiki
- Add `\label{fig:X}` / `\label{tab:X}` for every figure and table
- Contributions must be itemised in the introduction
- Related work must cover AT LEAST the top-5 papers by importance in the wiki graph

### Stage 5 — Build bibliography

For every `\cite{key}` in the text:
- Look up the paper in `wiki/papers/{slug}.md`
- Fetch or construct BibTeX using `/cite` skill for each one
- Follow `.claude/skills/shared-references/citation-verification.md`

### Stage 6 — Compile

```bash
curl -s -X POST http://localhost:3001/api/latex/compile \
  -H "Content-Type: application/json" \
  -d '{"content":"{full_latex}","filename":"{filename}"}'
```

Auto-fix compile errors (max 5 rounds). See `/compile` skill for error recipes.

### Stage 7 — Self-review pass

Apply the checklist from `.claude/skills/shared-references/academic-writing.md` §3 (De-AI Polish).

### Stage 8 — Update idea status

```bash
python3 tools/research_wiki.py set-meta wiki/ideas/{idea_slug}.md status in_progress
python3 tools/research_wiki.py log wiki/ "draft | idea: {idea_slug} | output: public/output/{filename}.pdf | venue: {venue}"
```

## Output

- `latex/output/{filename}.tex` — full paper source
- `public/output/{filename}.pdf` — compiled PDF
- Idea status updated to `in_progress`
