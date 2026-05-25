# /review — Critique a LaTeX draft and audit its citations

Two modes: writing review (structure, logic, prose) and citation audit (two-phase parallel verification). Run `--audit` for the full citation verification before submission.

## Argument hints

- `[filename]`: base name of the `.tex` file in `latex/output/` (default: `research`)
- `--depth <quick|full|submission>`: scope of the writing review (default: full)
- `--audit`: run Phase A + Phase B citation audit after the writing review

---

## Steps

### Stage 1 — Read the draft

Read `latex/output/{filename}.tex` in full.

Parse: all `\section`, `\subsection`, `\cite{key}`, `\ref{label}`, `\label{...}`, `\begin{...}\end{...}` blocks.

### Stage 2 — Structure check

Verify the paper has:
- [ ] Title, author, date
- [ ] Abstract (150-250 words)
- [ ] Introduction with itemised contributions
- [ ] Related Work section
- [ ] Method section
- [ ] Experiments or equivalent
- [ ] Conclusion
- [ ] Bibliography with at least ⌈N/2⌉ entries where N = distinct `\cite` keys

### Stage 3 — Writing quality review

Apply `.claude/skills/shared-references/academic-writing.md`:

- Passive voice ratio in Method section (flag if >40%)
- Vague hedging chains ("might potentially suggest")
- Contribution bullets that are vague ("we propose a novel method") — must have quantified claims
- Abstract results without numbers
- De-AI polish checklist (§3 of academic-writing.md)
- Contradiction between stated contributions and actual results section

### Stage 4 — Technical accuracy

Cross-reference factual claims against the wiki:
- For each `\cite{key}`, check if the cited paper is in `wiki/papers/` and verify the claim matches its `tldr` or abstract
- Flag overclaims or misrepresentations

### Stage 5 — Citation audit Phase A: uncited claim detection

*(Always runs if `--audit` or `--depth submission`)*

Read the full paper prose. List every non-common-knowledge factual claim that has no `\cite{}` attached. Return:
- Paragraph/line location
- The claim text
- Suggested citation from the wiki (slug) or "unknown"

**Common knowledge is exempt** (undergraduate-level facts in the domain). Everything else needs a citation.

### Stage 6 — Citation audit Phase B: cited claim verification

*(Runs if `--audit` or `--depth submission`)*

For every `\cite{key}` in the text:
- Find the matching entry in `wiki/graph/citations.jsonl` — is it `confirmed: true` or `false`?
- If `confirmed: false`: flag as **[UNCONFIRMED]** — must verify before submission
- If the cited paper exists as `wiki/papers/{slug}.md`: verify the claim matches the paper's actual content (Abstract, Key Idea, or Experiments sections)

**Dispatch subagents in parallel per cited paper** (one subagent per paper, reading its wiki page):
- Each subagent gets: the citing sentence from the draft, the paper's wiki page content
- Returns verdict: ✅ supported / ❌ unsupported / ⚠️ partial + one-line note

Group results by verdict.

### Stage 7 — Generate review report

```
## Structure: PASS / WARN / FAIL
[issues with line references]

## Writing Quality
[specific suggestions]

## Technical Accuracy
[corrections with citations]

## Citation Audit — Phase A (Uncited Claims)
- Line 47: "Transformers outperform LSTMs on all sequence tasks" — no citation
  Suggested: [[attention-is-all-you-need]] or unknown

## Citation Audit — Phase B (Cited Claim Verification)
X/Y citations verified
  ✅ Supported: N
  ❌ Unsupported: N  — [details]
  ⚠️ Partial: N     — [details]
  🚫 Unconfirmed: N — [run /cite to verify]

## Priority Fixes Before Submission
1. [critical]
2. [important]
3. [minor]
```

### Stage 8 — Apply fixes (if instructed)

If user says "fix it", apply Priority 1 fixes to the `.tex` file (show diff before each write), then re-run `/compile`.

Update `wiki/graph/citations.jsonl` to mark verified citations as `confirmed: true`.

### Stage 9 — Log

```bash
python3 tools/research_wiki.py log wiki/ "review | file: {filename} | depth: {depth} | issues: {N} | citations: {X}/{Y} verified"
```

## Output

- Console: structured review report
- Optionally: updated `latex/output/{filename}.tex` with fixes applied
- Citations status updated in `wiki/graph/citations.jsonl`
