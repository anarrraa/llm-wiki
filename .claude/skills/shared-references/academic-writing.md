# Academic Writing Standards

Used by: /draft, /survey, /review

---

## §1 — Paper Structure

### Abstract (150-200 words)
1. **Context** (1 sentence): what broad problem is this?
2. **Gap** (1 sentence): what is missing from prior work?
3. **Claim** (1 sentence): what does this paper do?
4. **Method** (1-2 sentences): how?
5. **Result** (1-2 sentences): quantitative improvement with numbers
6. **Implication** (1 sentence): so what?

### Introduction (4-6 paragraphs)
1. Broad motivation (hook the reader)
2. Prior work and its limitations
3. This paper's approach
4. **Contributions: an itemised list** — mandatory. At least 3 bullets.
5. Paper organisation ("The rest of the paper is organised as follows…")

### Related Work
- Organise by sub-topic, not chronologically
- Compare to your work, don't just summarise
- Use `\cite{}` for every claim about prior work
- Cover at minimum: the top-5 papers by `importance` in the wiki

### Method
- Lead with a section overview paragraph
- Every equation must be numbered with `\begin{equation}...\end{equation}`
- Every figure must have a caption that stands alone (reader shouldn't need the text to understand it)
- Use pseudocode for algorithms: `\begin{algorithm}` from the `algorithm2e` package

### Experiments
- State the research questions at the top of the section
- Describe baselines before results
- Use tables for multi-condition comparisons
- Report means ± std dev (or confidence intervals)
- Have an ablation study if you make multiple design choices

### Conclusion
- No new claims
- Restate contributions (1 sentence each)
- Limitations (be honest — reviewers respect honesty)
- Future work (be specific)

---

## §2 — Writing Quality Rules

**Be specific, not vague:**
- BAD: "Our method achieves better results"
- GOOD: "Our method improves BLEU-4 by 2.3 points (41.2 → 43.5) on WMT-14 En→De"

**Avoid hedging chains:**
- BAD: "may potentially suggest a possible improvement"
- GOOD: "improves" or "we observe an improvement"

**One claim per sentence.**

**Figures before the text that references them** (same page or the next).

**Table format:**
- Use `\toprule`, `\midrule`, `\bottomrule` from `booktabs`
- Bold the best number in each column
- Align numbers on the decimal point

**Equations:**
- Define every symbol before (or immediately after) it first appears
- Number every displayed equation

---

## §3 — De-AI Polish Checklist

When reviewing or editing AI-generated writing, scan for and remove:

- [ ] "In this paper, we" at the start of every paragraph
- [ ] "It is worth noting that" (just say it)
- [ ] "This is because" (just say why)
- [ ] "Furthermore" / "Moreover" / "Additionally" (vary connectives)
- [ ] "In conclusion" in the conclusion section (implicit)
- [ ] Passive voice dominating the method section (use active: "We train…")
- [ ] "State-of-the-art" without a citation
- [ ] Contribution bullets that are vague ("We propose a novel method")
- [ ] Abstract results without numbers ("achieves significant improvements")
- [ ] Figures with useless captions ("Figure 1: Results")

---

## §4 — LaTeX Best Practices

```latex
% Packages for quality writing
\usepackage{microtype}        % better justification
\usepackage{booktabs}         % professional tables
\usepackage{algorithm2e}      % pseudocode
\usepackage{hyperref}         % clickable references
\usepackage{cleveref}         % use \cref{} instead of \ref{}
\usepackage{natbib}           % author-year citations: \citet{}, \citep{}
```

**Citation style:**
- Inline: "Smith et al. \\citet{smith2023} propose…"
- Parenthetical: "prior work improves results \\citep{smith2023}"
- Multiple: "\\citep{smith2023,jones2024,wang2022}"

**Spacing:**
- Use `~` for non-breaking space before `\cite`: `results~\citep{smith2023}`
- Use `\,` before units: `32\,GB`, `0.001\,s`

**Avoid:**
- Manual line breaks `\\` in running text
- `\vspace{...}` to fix layout issues (fix the content instead)
- Inline `$x$` for variable names that have already been defined with display math

---

## §5 — Venue-Specific Notes

| Venue | Page limit | Citation style | Notes |
|---|---|---|---|
| NeurIPS | 9 pages | natbib author-year | Appendix unlimited |
| ICLR | 8 pages | natbib author-year | Anonymous submission |
| ICML | 8 pages | natbib author-year | Double-blind |
| ACL | 8 pages | acl_natbib | Software papers allowed |
| CVPR | 8 pages | IEEE | 12pt two-column |
| arXiv | unlimited | any | Not peer-reviewed |
