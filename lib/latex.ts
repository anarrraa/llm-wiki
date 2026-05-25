import type { Paper } from '@/store/researchStore'

export const SYSTEM_PROMPT = `You are a LaTeX document generator for academic research surveys.
You output ONLY valid, compilable LaTeX — nothing else.
You never explain your output, never use markdown fences, never add commentary.
Your output is fed directly into pdflatex without any preprocessing.`

export function buildSurveyPrompt(topic: string, papers: Paper[]): string {
  const paperList = papers
    .map((p, i) => {
      const key = 'arxiv' + (p.arxivId || p.id).replace(/[^a-zA-Z0-9]/g, '')
      return `[${i + 1}] cite-key: ${key}\nTitle: ${p.title}\nAuthors: ${p.authors.slice(0, 3).join(', ')}\nYear: ${p.published?.slice(0, 4) ?? 'n.d.'}\nArXiv: ${p.arxivId}\nAbstract: ${p.abstract.slice(0, 400)}`
    })
    .join('\n\n')

  return `You are an expert academic LaTeX typesetter. Generate a complete, compilable LaTeX survey document.

STRICT OUTPUT RULES:
- Output ONLY valid LaTeX. No markdown, no backticks, no prose before or after.
- Start with \\documentclass and end with \\end{document}.
- Every \\cite{key} must have a matching \\bibitem{key} in the bibliography.
- Every \\ref{label} must have a matching \\label{label} defined earlier.
- Do not use packages outside the approved list below.

APPROVED PACKAGES ONLY:
\\usepackage{amsmath,amssymb,amsthm}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\usepackage{booktabs}
\\usepackage{xcolor}
\\usepackage{microtype}
\\usepackage{url}

DOCUMENT STRUCTURE (follow exactly):
1. \\documentclass[12pt,a4paper]{article}
2. Package declarations (approved list only)
3. \\geometry{margin=1in}
4. Title, author ("Research Survey"), date
5. \\begin{abstract} ... \\end{abstract}
6. \\tableofcontents
7. \\section{Introduction} with \\label{sec:intro}
8. \\section{Background} with \\label{sec:background}
9. One \\section per major theme found across the papers
10. \\section{Discussion} with \\label{sec:discussion}
11. \\section{Conclusion} with \\label{sec:conclusion}
12. \\begin{thebibliography}{99} ... \\end{thebibliography}
13. \\end{document}

BIBLIOGRAPHY RULES:
- Use the exact cite-key given per paper below.
- Each bibitem: Author(s). Title. arXiv:ID, Year. \\url{https://arxiv.org/abs/ID}
- Cite every paper from the list at least once.

WRITING RULES:
- Each section minimum 150 words of substantive academic prose. No placeholder text.
- Use \\emph{} for emphasis in body text.
- Add \\label{sec:name} to every \\section.
- Tables must use booktabs (\\toprule, \\midrule, \\bottomrule).

TOPIC: ${topic}

PAPERS TO SURVEY (cite all ${papers.length}):
${paperList}`
}

function escapeTex(s: string): string {
  return s
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
}

function bibKey(paper: Paper): string {
  const id = paper.arxivId || paper.id
  return 'arxiv' + id.replace(/[^a-zA-Z0-9]/g, '')
}

export function buildTemplateSurvey(topic: string, papers: Paper[]): string {
  const date = new Date().toISOString().slice(0, 10)
  const safeTitle = escapeTex(topic)

  const paperSections = papers
    .map((p, i) => {
      const authors = p.authors.slice(0, 3).join(', ') + (p.authors.length > 3 ? ' et al.' : '')
      const year = p.published ? p.published.slice(0, 4) : date.slice(0, 4)
      const abstract = escapeTex(p.abstract.slice(0, 600))
      const key = bibKey(p)
      return `\\subsection{${escapeTex(p.title)}}

${escapeTex(authors)} (${year})~\\cite{${key}}.

${abstract}${p.abstract.length > 600 ? '~\\ldots' : ''}
`
    })
    .join('\n')

  const bibitems = papers
    .map((p) => {
      const authors = p.authors.join(', ') || 'Unknown'
      const year = p.published ? p.published.slice(0, 4) : date.slice(0, 4)
      const key = bibKey(p)
      const url = p.arxivUrl || `https://arxiv.org/abs/${p.arxivId}`
      return `\\bibitem{${key}}
${escapeTex(authors)}.
\\newblock ${escapeTex(p.title)}.
\\newblock \\textit{arXiv preprint arXiv:${escapeTex(p.arxivId)}}, ${year}.
\\newblock \\url{${url}}`
    })
    .join('\n\n')

  return `\\documentclass[12pt,a4paper]{article}
\\usepackage{amsmath,amssymb}
\\usepackage[hidelinks]{hyperref}
\\usepackage{geometry}
\\usepackage{booktabs}
\\usepackage{microtype}
\\geometry{margin=1in}

\\title{A Survey of ${safeTitle}}
\\author{llm-wiki Research Agent}
\\date{${date}}

\\begin{document}
\\maketitle

\\begin{abstract}
This document surveys ${papers.length} recent papers on the topic of ${safeTitle}.
The papers were retrieved from arXiv and are summarised below.
This survey was generated automatically from paper metadata; abstracts are reproduced from the original sources.
\\end{abstract}

\\section{Introduction}

This survey covers recent advances in ${safeTitle}.
The following ${papers.length} papers were selected for review.

\\section{Paper Summaries}

${paperSections}

\\section{Conclusion}

This survey presented ${papers.length} papers related to ${safeTitle}.
Future work includes deeper analysis of the methods and a structured comparison of experimental results.

\\begin{thebibliography}{${papers.length}}

${bibitems}

\\end{thebibliography}

\\end{document}
`
}

export const ARTICLE_TEMPLATE = `\\documentclass[12pt,a4paper]{article}
\\usepackage{amsmath,amssymb,amsthm}
\\usepackage{hyperref}
\\usepackage{geometry}
\\usepackage{natbib}
\\usepackage{booktabs}
\\usepackage{graphicx}
\\geometry{margin=1in}

\\title{Your Research Title}
\\author{Author Name}
\\date{\\today}

\\begin{document}
\\maketitle

\\begin{abstract}
Write your abstract here. Summarize the key contributions and findings of your work in 150--200 words.
\\end{abstract}

\\section{Introduction}
Introduce your topic and motivate the work.

\\section{Background}
Review relevant prior work.

\\section{Methods}
Describe your approach.

\\section{Results}
Present your findings.

\\section{Conclusion}
Summarize contributions and future directions.

\\end{document}
`
