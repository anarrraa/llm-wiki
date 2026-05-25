# runtime/ — Contract Layer

The four YAML files here define what is structurally legal in the wiki. **Edit with care** — every skill depends on this contract.

## Files

| File | Purpose |
|---|---|
| `schema/entities.yaml` | Fields, types, required/optional, enums, lifecycle states for each entity kind |
| `schema/edges.yaml` | Edge types, endpoint constraints, direction, required attributes |
| `schema/xref.yaml` | Which forward links require simultaneous reverse writes |
| `schema/conventions.yaml` | Slug grammar, path patterns, ownership zones, log format |
| `policy/writers.yaml` | Which skill may write which field or edge type |

## How to change the contract

1. Edit the YAML file.
2. Update any affected skill SKILL.md files (argument hints, step logic).
3. Run `python3 tools/lint.py wiki/` — if it passes, the change is safe.
4. Append to `wiki/log.md`: `- \`{date}\` contract | updated {file} | {reason}`

## Loader

`runtime/loader.py` is the Python access API. Import it in tools:

```python
from runtime.loader import ENTITIES, EDGES, CONVENTIONS, VALID_EDGE_TYPES
```

No code generation step — edit YAML, restart tools.

## Lifecycle States

**Ideas**: `proposed` → `in_progress` → `tested` → `validated` | `failed` | `abandoned`
**Experiments**: `planned` → `running` → `completed` | `failed`
**Concepts**: `emerging` → `active` → `stable` | `deprecated`
**Papers**: `discovered` → `read` → `ingested` | `skipped`

## Adding a New Entity Kind

1. Add entry to `schema/entities.yaml` with all required fields.
2. Add template to `templates/{kind}.md.tmpl`.
3. Add xref rules to `schema/xref.yaml` if it links to other kinds.
4. Add writer permissions to `policy/writers.yaml`.
5. Create `wiki/{kind}/` directory with `.gitkeep`.
6. Update CLAUDE.md skill catalog table.
