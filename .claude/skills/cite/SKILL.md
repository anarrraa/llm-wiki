# /cite — Fetch, verify, and add a citation to the wiki

Resolve a paper to a verified BibTeX entry, add it to `wiki/graph/citations.jsonl`, and optionally create a wiki page for it.

## Argument hints

- `<slug|url|doi>` (required): arXiv ID, DOI, full URL, or wiki slug
- `--bib-key <key>`: override the BibTeX key (default: derived from slug)
- `--add-to <filename>`: append BibTeX to `latex/output/{filename}.bib`

## Steps

### Stage 1 — Resolve the paper

**If arXiv ID** (e.g. `2301.00234`):
```bash
curl -s "https://export.arxiv.org/api/query?id_list=2301.00234" > raw/tmp/cite-fetch.xml
```
Parse: title, authors, year, journal=arXiv.

**If DOI** (e.g. `10.1145/...`):
```bash
curl -s -H "Accept: application/x-bibtex" "https://doi.org/{doi}"
```

**If URL**: fetch the page and extract metadata from `<meta>` tags or PDF header.

**If wiki slug**: read `wiki/papers/{slug}.md` frontmatter directly.

### Stage 2 — Construct BibTeX entry

```bibtex
@article{arxiv-2301-00234,
  title     = {Paper Title},
  author    = {Smith, John and Doe, Jane},
  year      = {2023},
  journal   = {arXiv preprint arXiv:2301.00234},
  url       = {https://arxiv.org/abs/2301.00234},
  eprint    = {2301.00234},
  archivePrefix = {arXiv},
}
```

Key format: `arxiv-{ID-with-hyphens}` for arXiv papers; `doi-{escaped-doi}` for published papers.

### Stage 3 — Verify the entry

Apply `.claude/skills/shared-references/citation-verification.md`:

- Title matches the actual paper title (not a preprocessed version)
- Authors list is complete (not truncated)
- Year is correct
- If venue is listed, it matches the actual venue

Mark as confirmed: no `[UNCONFIRMED]` flag.

### Stage 4 — Add to citations.jsonl

```bash
echo '{"from":"papers/{citing-slug}","to":"papers/{cited-slug}","type":"cites","source":"manual","confirmed":true,"bibtex_key":"{key}"}' >> wiki/graph/citations.jsonl
```

### Stage 5 — Optionally append to .bib file

If `--add-to` provided:
```bash
echo '{bibtex_entry}' >> latex/output/{filename}.bib
```

### Stage 6 — Log

```bash
python3 tools/research_wiki.py log wiki/ "cite | key: {bibtex_key} | paper: {title} | confirmed: true"
```

## Output

- BibTeX entry printed to console
- Entry added to `wiki/graph/citations.jsonl`
- Optionally appended to `.bib` file
