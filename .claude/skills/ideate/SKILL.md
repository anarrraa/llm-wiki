# /ideate — Generate novel research ideas from wiki knowledge gaps

Analyse the wiki's concept graph, identify underexplored gaps, and generate ranked research ideas. Write each to `wiki/ideas/`.

## Argument hints

- `--topic <string>`: focus ideation on a specific topic or concept
- `--n N`: number of ideas to generate (default: 5)
- `--mode <gaps|combinations|extensions>`: ideation strategy (default: gaps)
  - `gaps`: find concepts with open problems and no linked ideas
  - `combinations`: find concepts that co-appear but have no bridging idea
  - `extensions`: take a high-importance paper and propose extensions

## Prerequisites

- At least 5 papers ingested in the wiki
- `wiki/graph/context_brief.md` is up to date (run `python3 tools/research_wiki.py rebuild-context-brief wiki/`)

## Steps

### Stage 1 — Analyse the knowledge graph

```bash
python3 tools/research_wiki.py rebuild-context-brief wiki/
python3 tools/research_wiki.py rebuild-open-questions wiki/
cat wiki/graph/open_questions.md
```

Read `wiki/graph/context_brief.md` and `wiki/graph/open_questions.md`.

### Stage 2 — Build ideation context

Depending on `--mode`:

**gaps**: Find concepts where:
- `linked_ideas` is empty
- `open_problems` body section has content
- maturity is `emerging` or `active`

**combinations**: Find pairs of concepts that:
- Both appear in `key_papers` of different papers
- Have no direct edges between them
- Have no existing idea linking them

**extensions**: Find papers where:
- `importance >= 2`
- `open_questions` section is non-empty
- Have <2 ideas in `linked_papers`

### Stage 3 — Generate ideas with Claude

For each gap/combination/extension identified, generate a research idea. The idea should:
- State a falsifiable hypothesis
- Reference specific wiki papers and concepts by slug
- Explain novelty clearly (what has NOT been done per the wiki)
- Propose a concrete experiment that could test it
- Give an honest risk assessment

Generate `--n` ideas total, ranked by:
1. Feasibility (can it be done with available compute?)
2. Novelty (does the wiki confirm this is unexplored?)
3. Impact (does it address a core open problem?)

### Stage 4 — Write idea entities

For each idea with novelty_score >= 2:

```bash
python3 tools/research_wiki.py slug "{idea title}"
```

Create `wiki/ideas/{slug}.md` from `runtime/templates/ideas.md.tmpl`.

Frontmatter: kind=ideas, title, slug, status=proposed, origin_gaps=[list of concept slugs], novelty_score, priority.

Body: fill all sections from the generation above.

### Stage 5 — Write edges

For each idea:
```bash
# Link idea → concepts it addresses
python3 tools/research_wiki.py add-edge wiki/ \
  --from ideas/{idea-slug} --to concepts/{concept-slug} \
  --type addresses_gap

# Link idea → papers that inspired it
python3 tools/research_wiki.py add-edge wiki/ \
  --from ideas/{idea-slug} --to papers/{paper-slug} \
  --type inspired_by
```

Apply xref rules from `runtime/schema/xref.yaml`.

### Stage 6 — Rebuild and log

```bash
python3 tools/research_wiki.py rebuild-index wiki/
python3 tools/research_wiki.py log wiki/ "ideate | mode: {mode} | generated: {N} ideas | top: {top-slug}"
```

## Output

- `wiki/ideas/{slug}.md` — one per new idea
- Edges in `wiki/graph/edges.jsonl`
- Present ranked summary to user: "Generated N ideas. Top idea: {title} (novelty: X/3)"
