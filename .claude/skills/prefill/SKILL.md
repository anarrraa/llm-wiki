# /prefill — Seed wiki/foundations/ with domain background knowledge

Populate the `foundations/` sub-directory with background concepts that underpin a research domain. These are terminal nodes — they don't cross-reference back.

## Argument hints

- `<domain>` (required): e.g. `nlp`, `cv`, `rl`, `ml`, `math`, `statistics`
- `--topic <string>`: narrower focus within the domain
- `--depth <shallow|standard|deep>`: how many foundations to create (shallow=5, standard=10, deep=20)

## Domain catalogs

**nlp**: attention, transformer, tokenisation, language-modelling, bert, fine-tuning, prompting, rlhf, chain-of-thought, embedding

**cv**: convolutional-network, residual-connection, batch-normalisation, object-detection, image-segmentation, vit, diffusion-process, contrastive-learning

**rl**: markov-decision-process, bellman-equation, q-learning, policy-gradient, actor-critic, reward-shaping, model-based-rl, multi-agent-rl

**ml**: gradient-descent, backpropagation, regularisation, cross-entropy-loss, overfitting, bias-variance, probabilistic-inference, gaussian-process

**math**: linear-algebra, probability-theory, information-theory, convex-optimisation, graph-theory, fourier-transform

**statistics**: maximum-likelihood, bayesian-inference, hypothesis-testing, causal-inference, confidence-interval

## Steps

### Stage 1 — Select foundations

From the domain catalog above (or `prefill/foundations-catalog.yaml` if it exists), select foundations matching the domain and topic.

If domain is not in catalog, generate a list of N foundational concepts specific to the domain.

### Stage 2 — Create foundation pages

For each concept, check if `wiki/foundations/{slug}.md` already exists.

If **missing**, create from `runtime/templates/foundations.md.tmpl`:

Frontmatter:
```yaml
kind: foundations
title: "{Human-readable Name}"
slug: {slug}
status: stable
domain: {domain}
prerequisites: [list of other foundation slugs this builds on]
key_references: []
```

Body: fill Core Idea, Formal Definition, Intuition, Key Results, Connections, References — based on well-established knowledge of the concept.

Foundations are **stable background knowledge** — write them with textbook accuracy.

### Stage 3 — Set prerequisites

For each foundation, set `prerequisites` to other foundations it builds on (slugs). These must also exist in `wiki/foundations/`.

Do NOT add xref edges for foundations — they are terminal nodes per `runtime/schema/xref.yaml`.

### Stage 4 — Rebuild index

```bash
python3 tools/research_wiki.py rebuild-index wiki/
```

### Stage 5 — Log

```bash
python3 tools/research_wiki.py log wiki/ "prefill | domain: {domain} | created: {N} foundations"
```

## Output

- `wiki/foundations/{slug}.md` — one per foundation concept created
- `wiki/index.md` rebuilt
