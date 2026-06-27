# WCT Graph Engine

A vault-local Obsidian research browser for navigating, validating, auditing, and replaying the WCT corpus.

## Version 0.6 — research browser

Version 0.6 reorganizes each selected graph object into a tabbed research view instead of one long inspector panel.

Tabs:

- **Overview** — canonical summary, identity, chronology, validation, connection counts, and audit findings.
- **Definition** — the note's Definition section, with fallback to the canonical WCT Glossary entry.
- **Equations** — rendered display equations, connected equation objects, canonical SymPy families, and matching Lean declarations.
- **Papers** — paper links written in the note and connected paper objects.
- **Links** — typed outgoing research relations and ordinary Obsidian links.
- **Backlinks** — typed incoming relations and ordinary Obsidian backlinks.
- **Properties** — readable frontmatter properties with Unicode symbol normalization.
- **Repositories** — matching definitions and formal objects from `geometry_of_resonance`, `wct-sympy`, and `wct-lean`.
- **All** — the principal research sections in one scrollable view.
- **Source** — the entire note rendered as Markdown and LaTeX.

Every tab has an object-local search field so a large object can be viewed in full or narrowed to one definition, equation ID, paper, property, relation, or repository declaration.

## Pretty mathematics and symbols

Equation blocks are passed through Obsidian's Markdown renderer so vault LaTeX is displayed rather than shown as raw source.

Repository definitions use canonical notation such as:

$$
\Theta_\varepsilon[\psi]
=
-(\Delta\psi)
\frac{\overline\psi}{|\psi|^2+\varepsilon^2e^{-2\alpha|\psi|^2}},
$$

$$
\sigma(k)=r+a k^2-b k^4,
\qquad
k_\star=\sqrt{\frac{a}{2b}},
$$

and

$$
\psi\in H^s,
\quad s>\frac n2+2
\Longrightarrow
\Theta_\varepsilon[\psi]\in L^\infty.
$$

Property values normalize common symbol names such as `psi`, `Theta`, `sigma`, `kappa`, `tau`, `lambda`, `phi`, `hbar`, `Delta`, `partial`, and `grad` to readable Unicode where appropriate.

## Repository matching

The **Repositories** and **Equations** tabs use a local canonical index derived from the maintained repository documentation.

### geometry_of_resonance

Role: canonical master equations, corrected equation registry, paper source, and research implementations.

### wct-sympy

Role: executable symbolic identities, dimensions, limits, residuals, and counterexamples.

Recognized families include:

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

### wct-lean

Role: kernel-checked definitions, lemmas, counterexamples, and conditional theorems.

The browser currently recognizes formal mappings including:

- E2 — `densityWeightedAverage_denominator_ne_zero`;
- E3 — `lockingMismatch_nonnegative`, `lockingMismatch_zero`;
- E5 — effective-wavenumber chain declarations;
- E9 — phase-current and conservation-residual declarations;
- E13/E14 — `bandpass_oneMode_symbol`;
- E18 — nonnegative energy and gradient-flow descent;
- E58 — band-selective Green-kernel bounds;
- CM9 — first-order/second-order oscillator equivalence;
- CM12, CM13, and CM16 — power-spectrum, peak-ratio, and horizon definitions.

The vault note `Research/06 Repositories/WCT Repository Registry.md` preserves the same repository roles and canonical formulas in ordinary Obsidian Markdown.

## Commands

- `WCT Graph Engine: Open WCT Graph`
- `WCT Graph Engine: Open WCT Research Audit`
- `WCT Graph Engine: Open WCT Idea Timeline`

## Main graph controls

- **Full graph** — complete clustered corpus.
- **Audit** — corpus closure audit.
- **Timeline** — creation-date timelapse and force view.
- Click a category node or label to enter it.
- Click a note to open the research browser.
- Double-click a note or choose **View connections** for a recursive local graph.
- Use **Back** or breadcrumbs to unwind.
- Drag empty space to pan.
- Scroll to zoom.
- **Fit** frames the scene.
- **Motion** cycles Full, Reduced, and Off.
- **Rebuild** refreshes metadata and generated-object links.

## Timeline

Timeline controls:

- Play / Pause;
- Restart;
- manual date scrubber;
- 8, 18, 30, or 60 second playback;
- Center force;
- Repel force;
- Link-distance force.

Date priority:

1. `idea_date`
2. `created`
3. `created_at`
4. `creation_date` or `date_created`
5. `date`
6. file creation time
7. file modification time

Explicit `idea_date` or `created` values provide more reliable historical playback than filesystem timestamps.

## Stable object identity

Existing frontmatter IDs such as:

```yaml
id: obj_1dcc2d3a2afb
```

are treated as stable identifiers. Objects without an explicit ID receive a temporary type-prefixed path hash and appear in the audit as **Objects missing stable IDs**.

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

The semantic filter suppresses obvious extraction noise including:

- single letters;
- authors;
- aliases;
- comment;
- family;
- overview;
- figure;
- table;
- generic claim, definition, or research-notes nodes.

Citation-shaped text is reclassified as **References** even when an earlier extractor labeled it as a definition.

## Repaired references

Generated reference objects can resolve both:

```markdown
[[WCT Corpus Sources 082-114#^SRC-097|citation text]]
[[art_83f18cbcdb2d]]
```

The first becomes a `CITES →` edge to the corpus source note. The second resolves through the target artifact's frontmatter ID and becomes a `DERIVED FROM →` edge.

## Global graph search

Examples:

```text
id:obj_1dcc2d3a2afb
type:References
status:conditional
audit:missing-stable-id
after:2025-01-01
before:2026-01-01
type:Equations status:pass
"curvature locking"
```

Supported filters:

- `id:` or `uuid:`
- `type:`
- `status:`
- `audit:`
- `path:`
- `after:`
- `before:`

## Validation metadata

```yaml
---
symbolic_status: PASS
formal_status: CONDITIONAL
physical_status: OPEN
experimental_status: UNTESTED
---
```

The node fill color represents semantic type. The outer ring represents aggregate validation state.

## Research audit

The Audit view detects:

- glossary objects without definitions;
- equations without derivation relations;
- equations without implementation relations;
- predictions without experiment relations;
- experiments without evidence relations;
- papers without equation links;
- unreviewed validation state;
- generated objects without explicit stable IDs.

## Relationship to the research compiler

The graph consumes semantic object metadata but does not replace the extraction compiler. The compiler remains responsible for permanent type-specific IDs, semantic classification, structured reference extraction, equation ASTs, provenance, duplicate merging, and executable claim or experiment schemas.

See `Research/00 Maps/WCT Research Compiler V2.md` for the target architecture.

## Other graph plugins

Extended Graph and Graph Presets may remain installed for Obsidian's built-in Graph View. The older WCT Motion, Navigator, Polish, Pointer Fix, Content Details, and Panel Isolation plugins should remain disabled.
