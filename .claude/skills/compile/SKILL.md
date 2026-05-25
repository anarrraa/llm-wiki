# /compile — Compile a LaTeX file to PDF with auto-fix loop

Compile a `.tex` file using pdflatex, automatically diagnose and fix errors, and return the PDF path.

## Argument hints

- `[filename]`: base name without extension (default: `research`); looks in `latex/output/`
- `--source <path>`: explicit path to a `.tex` file
- `--passes N`: number of pdflatex passes (default: 2, use 3 for complex cross-references)
- `--max-fixes N`: maximum auto-fix attempts (default: 5)

## Prerequisites

- pdflatex installed at `$PDFLATEX_PATH` or `/usr/local/texlive/2026basic/bin/universal-darwin/pdflatex`
- `npm run dev` running (or use pdflatex directly)

## Steps

### Stage 1 — Locate source file

If `--source` provided: use that path.
Otherwise: look for `latex/output/{filename}.tex`.
If not found: look for `latex/output/research.tex`.

### Stage 2 — Compile via API

```bash
CONTENT=$(cat {filepath})
curl -s -X POST http://localhost:3001/api/latex/compile \
  -H "Content-Type: application/json" \
  -d "{\"content\":$(echo "$CONTENT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),\"filename\":\"{filename}\"}"
```

Or call pdflatex directly:
```bash
PDFLATEX="${PDFLATEX_PATH:-/usr/local/texlive/2026basic/bin/universal-darwin/pdflatex}"
"$PDFLATEX" -interaction=nonstopmode -output-directory=public/output latex/output/{filename}.tex
```

### Stage 3 — Parse errors

If compilation failed, read the log. Look for lines starting with `!`.

**Error recipes:**

| Error | Fix |
|---|---|
| `! Undefined control sequence \X` | Add `\usepackage{X}` or fix the macro |
| `! Missing $ inserted` | Wrap bare math symbol with `$...$` |
| `! Package babel Error` | Remove or fix `\usepackage[...]{babel}` |
| `! LaTeX Error: File 'X.sty' not found` | Remove `\usepackage{X}` or install package via `tlmgr install X` |
| `Runaway argument? ... ! Paragraph ended` | Find unclosed `{` brace |
| `! Missing \endcsname inserted` | Quote or escape the special character |
| `Overfull \hbox` (warning only) | Add `\usepackage{microtype}` to preamble |
| Citation undefined | Add `\bibitem{key}` to bibliography section |
| Label undefined | Add `\label{...}` where referenced |

### Stage 4 — Auto-fix loop

For each error found:
1. Apply the fix recipe above by editing the LaTeX source in memory.
2. Re-run compile.
3. If passes remaining > 0, recurse.

If after `--max-fixes` attempts the PDF still fails, show the user the remaining errors and stop.

### Stage 5 — Report result

On success:
```
✓ PDF compiled: /output/{filename}.pdf
  Open: http://localhost:3001/output/{filename}.pdf
```

Log:
```bash
python3 tools/research_wiki.py log wiki/ "compile | file: {filename} | status: success | fixes: {N}"
```

## Output

- `public/output/{filename}.pdf`
- URL: `http://localhost:3001/output/{filename}.pdf`
