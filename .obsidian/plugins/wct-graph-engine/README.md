# WCT Graph Engine

A vault-local Obsidian research browser for navigating, validating, prioritizing, auditing, and replaying the WCT corpus.

## Version 0.7 — knowledge navigation and research completion

Version 0.7 turns the object inspector into a more explicit scientific knowledge navigator.

### Wikipedia-style definitions

The **Definition** tab now shows:

- the canonical definition from the selected note;
- fallback text from `Research/03 Glossary/WCT Glossary.md`;
- cross-paper synthesis where available;
- related definition cards;
- the semantic relation between concepts;
- a short definition excerpt for each linked concept;
- clickable navigation between concepts without leaving the graph.

Use ordinary Obsidian links such as `[[Curvature Operator]]` and typed relations such as `defines`, `defined-by`, `uses`, and `depends-on` to create the strongest concept trails.

### Derivations and equations

The research browser now includes a dedicated **Derivations** tab.

It connects:

```text
Equation ↔ Derivation
```

through:

- ordinary graph links;
- `derives`;
- `derived-from`;
- `depends-on`.

The **Equations** tab also shows linked derivations, their relation type, and their research-completion percentage. A derivation note shows the equations it establishes or depends on.

Recommended metadata:

```yaml
relations:
  derives:
    - E24 — Dimensional stability
  depends-on:
    - Sobolev embedding threshold
```

### Validation completion

Each object receives four separate indicators:

- **Research completeness** — whether the fields and links expected for that semantic object type are present;
- **Validation completion** — weighted closure of symbolic, formal, physical, and experimental status;
- **Validation coverage** — how many of those four dimensions have any recorded state;
- **Priority** — action priority based on incompleteness, validation gaps, audit severity, centrality, contradiction state, and optional explicit priority.

The percentage is a workflow-completion measure. It is **not** a probability that a claim or equation is true.

Validation weights currently used for completion:

| State | Completion weight |
|---|---:|
| PASS | 100% |
| EMPIRICAL | 85% |
| CONDITIONAL | 60% |
| DEFINITION | 35% |
| OPEN | 15% |
| UNTESTED | 10% |
| UNREVIEWED | 0% |
| FAIL / CONTRADICTED | 100% resolved, displayed as failed or contradicted |

The individual status badges remain visible so the percentage cannot hide whether progress is positive, conditional, open, or failed.

### Priority bubble-up and ranked list

Use:

```text
WCT Graph Engine: Open WCT Priority Bubble-Up
```

or click **Priority** in the graph toolbar.

The priority view provides both:

- a bubble-up graph where node size reflects action priority;
- a searchable ranked list with priority, completeness, validation, and the leading reason the object surfaced.

Optional frontmatter:

```yaml
priority_value: 80
```

The explicit value influences the score but does not replace automatic diagnostics.

The **Priority** tab on every object explains:

- its score;
- why it bubbled up;
- its missing completion checks;
- each validation dimension and its contribution.

### Readability controls

The graph and inspector are now adjustable.

Toolbar:

- **Labels** cycles graph-label size.

Inspector header:

- **A−** decreases panel text size;
- **A+** increases panel text size;
- the width button cycles 560, 690, 820, and 940 pixels.

Settings also expose:

- panel text size;
- inspector width;
- graph-label size;
- focused-label enlargement;
- hover-card size;
- priority bubble and list limits.

Hovered and selected object labels automatically enlarge. Selected labels receive a type-colored outline.

### Semantic hover cards

Hover cards are color coordinated with the research-object type and browser tabs.

They show:

- object type;
- validation completion;
- research completeness;
- priority score;
- counts for definitions, equations, derivations, references, and links;
- the best available definition or summary;
- the leading next action.

Facet colors follow the browser:

- definitions — green;
- equations — orange;
- derivations — red;
- references — gray;
- links and backlinks — blue;
- papers — purple;
- repositories — pink.

## Research-browser tabs

- **Overview** — completion, priority, summary, identity, chronology, validation, connection counts, and audits.
- **Priority** — action score, reasons, missing checks, and validation dimensions.
- **Definition** — canonical definition, synthesis, and related concepts.
- **Equations** — rendered mathematics, canonical families, formal mappings, and linked derivations.
- **Derivations** — local derivation text and equation–derivation relationships.
- **Papers** — paper appearances and connected paper objects.
- **Links** — typed outgoing relations and ordinary Obsidian links.
- **Backlinks** — typed incoming relations and ordinary backlinks.
- **Properties** — readable frontmatter with Unicode symbol normalization.
- **Repositories** — mappings to `geometry_of_resonance`, `wct-sympy`, and `wct-lean`.
- **All** — all principal sections in one scrollable view.
- **Source** — the complete note rendered as Markdown and LaTeX.

Each tab has object-local search.

## Pretty mathematics and repository matching

Equation blocks are rendered through Obsidian's Markdown renderer. Repository mappings include canonical WCT notation and formal references from:

- `geometry_of_resonance`;
- `wct-sympy`;
- `wct-lean`.

Recognized equation families include:

- E1A, E1B, E2–E8 — rest energy and loop locking;
- E9–E16 — phase flux and finite-band selection;
- E17–E23 — curvature feedback;
- E24–E27 and E65–E70 — dimensional stability and regularity;
- E28–E34, E41, and E72 — entropy and recursive state evolution;
- E44–E56 — cavity, power balance, and effective mass;
- E57–E64 — spectral projection;
- CLE1–CLE10 — curvature-locked electron family;
- G1, EX, EY, EZ, and FA — logarithmic transforms;
- CM1–CM20 — curvature-acoustic cosmology.

## Commands

- `WCT Graph Engine: Open WCT Graph`
- `WCT Graph Engine: Open WCT Research Audit`
- `WCT Graph Engine: Open WCT Idea Timeline`
- `WCT Graph Engine: Open WCT Priority Bubble-Up`

## Main graph controls

- **Full graph** — complete clustered corpus.
- **Audit** — corpus closure audit.
- **Timeline** — creation-date timelapse and force view.
- **Priority** — incomplete and high-impact objects bubbled upward.
- **Labels** — cycles graph-label scale.
- Click a category node or label to enter it.
- Click a note to open the research browser.
- Double-click a note or choose **View connections** for a recursive local graph.
- Use **Back** or breadcrumbs to unwind.
- Drag empty space to pan.
- Scroll to zoom.
- **Fit** frames the scene.
- **Motion** cycles Full, Reduced, and Off.
- **Rebuild** refreshes metadata, scores, and generated-object links.

## Stable object identity

Existing frontmatter IDs are treated as stable identifiers. Objects without an explicit ID receive a temporary type-prefixed path hash and appear in the audit as **Objects missing stable IDs**.

The long-term compiler should issue permanent IDs such as:

```text
DEF-000143
EQ-000082
CLA-000051
EXP-000017
REF-000489
THM-000004
```

## Semantic generated-object filter

`WaveLock Research/Objects` and `WaveLock Research/Artifacts` are indexed alongside `Research`.

The semantic filter suppresses obvious extraction noise including single letters, author metadata, aliases, comments, generic headings, and unqualified sentence fragments. Citation-shaped text is reclassified as **References** even when an older extractor labeled it as a definition.

## Relationship to Research Compiler V4

WCT Graph Engine is the human-facing research browser. The canonical object registry, assertion store, provenance, version history, heterogeneous ingestion, semantic extraction, and entity resolution belong to **WaveLock Research Compiler V4**.

The graph displays and audits the current vault projection; it does not claim that workflow completion percentages are scientific confidence or proof.

## Other graph plugins

Extended Graph and Graph Presets may remain installed for Obsidian's built-in Graph View. The older WCT Motion, Navigator, Polish, Pointer Fix, Content Details, and Panel Isolation plugins should remain disabled.
