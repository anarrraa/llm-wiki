# llm-wiki

Research search and writing workspace built around a lightweight `raw -> wiki -> runtime schema` flow.

## Structure

```text
app/          Next.js routes and API endpoints
components/   UI panels for search, wiki stats, and LaTeX work
lib/          Server-side helpers for arXiv, wiki IO, LaTeX, and runtime guards
store/        Client state

raw/          Source intake buckets
wiki/         Distilled markdown knowledge base
runtime/      Schema, policy, and markdown templates
latex/        Hand-authored LaTeX templates only
public/       Static assets and generated previews
```

## Kept Intentionally

- `raw/{papers,notes,web}` are stable intake zones.
- `raw/{discovered,tmp}` are scratch zones described by the runtime contract.
- `wiki/{papers,concepts,topics,ideas,experiments,methods,people,foundations}` are the typed wiki buckets, even if some are empty today.
- `runtime/schema` and `runtime/templates` define the wiki contract and should stay close to the repo root.

## Removed / Simplified

- Unused `Summary` wiki entity shape was removed from the runtime schema.
- Generated LaTeX build artifacts should not live in the repo.
- Accidental brace-named directories under `app/` should not exist.
