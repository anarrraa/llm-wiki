# Citation Verification Protocol

Used by: /cite, /ingest, /draft, /review

All citations in a paper draft are either **confirmed** or **[UNCONFIRMED]**.
Unconfirmed citations MUST be resolved before submission.

---

## Confirmed vs Unconfirmed

**Confirmed**: BibTeX entry was fetched from an authoritative source (DOI resolver, arXiv API, or Semantic Scholar) and the title/authors were verified against the actual paper.

**[UNCONFIRMED]**: entry was constructed from memory, an abstract mention, or an LLM output — not directly fetched.

Mark unconfirmed entries in `citations.jsonl`:
```json
{"from":"papers/my-paper","to":"papers/ref-slug","confirmed":false,"bibtex_key":"smith2023"}
```

Add a comment in the `.bib` file:
```bibtex
@article{smith2023,  % [UNCONFIRMED] — verify before submission
  ...
}
```

---

## Verification Steps

### Step 1 — Fetch from arXiv (preferred for ML papers)

```bash
curl -s "https://export.arxiv.org/api/query?id_list={arxiv_id}"
```

Extract `<title>` and `<author>` fields. Compare against what's in the BibTeX.

### Step 2 — DOI resolver (for published papers)

```bash
curl -s -H "Accept: application/x-bibtex" "https://doi.org/{doi}"
```

This returns a BibTeX entry directly. Use it verbatim.

### Step 3 — Semantic Scholar (fallback)

If arXiv ID and DOI are unknown:
```bash
python3 tools/fetch_s2.py --title "{title}" --author "{first_author_last_name}"
```

### Step 4 — Manual check

If all fetches fail: open the paper's abstract page in a browser and manually confirm:
- Title matches exactly (case, punctuation, subtitles)
- First author's last name matches
- Year matches

---

## Common Mistakes

| Mistake | How to catch |
|---|---|
| Title has wrong capitalisation | Compare against arXiv title exactly |
| Author name uses initials where full name expected | Check via DOI resolver |
| Wrong year (preprint vs. published) | Check if paper was accepted at a venue |
| Self-citation loop | Check that `from != to` in citations.jsonl |
| Citing a retracted paper | Search Retraction Watch if paper is >3 years old |
| Citing arXiv as published | Check DBLP for the final venue |

---

## Bulk Verification Workflow

When submitting a paper with N citations:

1. Export all `\bibitem` or `.bib` keys from the LaTeX source
2. Cross-reference each against `citations.jsonl` — flag any missing entry
3. For each unconfirmed entry, run Steps 1-3 above
4. Update `confirmed: true` in `citations.jsonl` once verified
5. Run `/check --strict` to confirm zero unconfirmed citations

Target: **100% confirmed citations before submission**.
