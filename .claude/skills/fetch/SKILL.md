# /fetch — Download web content or PDFs into raw/

Fetch a URL (web page, PDF, or arXiv abstract) and save it to `raw/` for later reading or ingestion.

## Argument hints

- `<url>` (required): the URL to fetch
- `--type <web|paper|notes>`: raw subdirectory to save to (default: auto-detected from content-type)
- `--name <slug>`: override the saved filename
- `--ingest`: after fetching, immediately run `/ingest` on it

## Steps

### Stage 1 — Fetch via API

```bash
curl -s -X POST http://localhost:3001/api/raw/fetch \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"{url}\",\"type\":\"{type}\"}"
```

The endpoint auto-detects PDFs by content-type or `.pdf` extension.

### Stage 2 — Confirm saved path

The API returns `{ saved: "raw/web/...", type: "html|pdf", excerpt: "..." }`.

Print to user:
```
Fetched: {url}
Saved:   {saved_path}
Type:    {type}
Preview: {excerpt[:200]}
```

### Stage 3 — Optional immediate ingest

If `--ingest` flag was passed, run `/ingest --url {url}` automatically.

Otherwise, suggest:
> "Saved to {path}. Run `/ingest --url {url}` to add it to your wiki."

### Stage 4 — Log

```bash
python3 tools/research_wiki.py log wiki/ "fetch | url: {url} | saved: {path} | type: {type}"
```

## Output

- `raw/{type}/{slug}.html` or `raw/{type}/{slug}.pdf`
- Console confirmation with path and preview
