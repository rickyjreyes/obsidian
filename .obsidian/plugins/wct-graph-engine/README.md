# WCT Graph Engine

A vault-local Obsidian research browser for navigating, extracting, validating, prioritizing, auditing, and replaying the WCT corpus.

## Version 0.8 — PDF derivations, searchable research state, and readable graph labels

Version 0.8 addresses four gaps in the research browser:

1. derivations can now be imported from the full-text PDFs referenced by literature notes;
2. graph labels prefer the space above their circles;
3. the Priority view now contains a searchable and filterable table;
4. every object explains its current state and exactly what is still missing.

## PDF derivation import

The vault previously contained PDF URLs and literature-note abstracts, but not the derivation text inside the PDFs. A graph browser cannot display mathematics that has never been ingested.

Version 0.8 adds a local, conservative PDF derivation importer.

### Install the extractor

Python 3 is required. On Windows, install the preferred extraction backend once:

```powershell
py -m pip install pymupdf
```

The importer can also use `pypdf` or the `pdftotext` executable, but PyMuPDF is preferred.

### Run the importer

From the Obsidian command palette:

```text
WCT Graph Engine: Import PDF Derivations
```

Other commands:

```text
WCT Graph Engine: Re-import All PDF Derivations
WCT Graph Engine: Open PDF Derivation Import Report
```

A single paper can also be imported or re-imported from that paper's **Derivations** tab.

### What it reads

The importer scans:

```text
Research/01 Literature Notes
```

for notes containing:

```yaml
pdf_url: https://...
```

It downloads those PDFs into the local ignored cache:

```text
.wct-cache/pdfs
```

and writes persistent research objects into:

```text
Research/08 Derivations/PDF
```

### What it extracts

The importer searches page-by-page for:

- derivation and proof headings;
- mathematical and analytical development sections;
- governing-equation sections;
- calculation sections;
- equation-dense passages containing derivation language;
- canonical equation IDs such as `E24`, `CLE3`, and `CM12`.

Each generated derivation object records:

- stable `DRV-PDF-*` identity;
- source paper;
- source PDF URL;
- exact page range;
- extraction backend and rule;
- extraction confidence;
- extracted derivation text;
- equation-like text preserved from the PDF;
- detected equation IDs;
- links to matching canonical equation notes;
- human-verification state;
- canonical-LaTeX-verification state;
- a concrete **What is missing** checklist.

### Important boundary

An imported derivation is a **page-provenance extraction**, not a mathematical verification.

PDF text extraction can damage:

- fraction bars;
- superscripts and subscripts;
- Greek symbols;
- equation ordering;
- matrices and diagrams;
- multi-column reading order.

Generated objects therefore begin with:

```yaml
human_verified: false
canonical_latex_verified: false
symbolic_status: UNREVIEWED
formal_status: UNREVIEWED
physical_status: UNREVIEWED
experimental_status: UNREVIEWED
```

Set the two verification fields to `true` only after comparing the object with the rendered source pages and replacing extraction-only mathematics with canonical LaTeX.

### Import report

Every run creates:

```text
Research/08 Derivations/PDF/_PDF Derivation Import Report.md
```

The report gives a table of:

- paper;
- import state;
- number of generated sections;
- extraction backend;
- current state or failure reason.

Possible states are:

- **Imported** — page-provenance derivation objects were generated;
- **No derivation sections detected** — the conservative detector found no qualifying passage;
- **Failed** — download or extraction failed, with the immediate cause recorded.

The research audit now includes **PDF papers missing imported derivations**.

## Searchable priority and research-state table

Click **Priority** or run:

```text
WCT Graph Engine: Open WCT Priority Table and Bubble-Up
```

The priority scene still uses node size to show action priority, but the accompanying interface is now a real table.

Columns:

| Column | Meaning |
|---|---|
| Object | Canonical name and stable ID/path |
| Type | Definition, equation, derivation, paper, experiment, and so on |
| Priority | Action priority from 0–100 |
| Complete | Required workflow fields and links present |
| Validation | Weighted closure of symbolic, formal, physical, and experimental states |
| Current state | Plain-language explanation of where the object stands |
| What is missing | Up to three immediate missing requirements, with the remainder counted |

The table supports:

- free-text search across names, IDs, paths, states, missing items, and priority reasons;
- object-type filtering;
- state filtering;
- **Missing only** filtering;
- sorting by priority, number missing, completeness, validation, or name.

State filters include:

- failed or contradicted;
- PDF derivations missing;
- not assessed;
- open or missing;
- conditional or awaiting review;
- complete.

Click or press Enter on a row to open that object's inspector.

## Current state and what is missing

Every object's **Priority** tab now begins with a plain-language current-state card.

Examples:

- **PDF derivations not imported** — the paper has a known PDF, but no page-provenance derivations are connected;
- **PDF extraction awaiting review** — text was imported, but human and canonical-LaTeX verification remain pending;
- **Not assessed** — no validation dimension has been recorded;
- **Structurally complete; validation open** — the required graph structure exists, but validation work remains;
- **Failed or contradicted** — at least one validation dimension requires resolution;
- **Complete and resolved** — no required workflow item is missing and no validation dimension remains unresolved.

The tab then lists each missing requirement with an action-oriented explanation, such as:

- import PDF derivations;
- link a canonical equation;
- add a derivation;
- record assumptions;
- add SymPy or Lean implementation;
- add experimental evidence;
- set a permanent stable ID;
- verify the source pages;
- replace extraction-only mathematics with canonical LaTeX.

The four validation dimensions are shown independently so a single percentage cannot conceal an open, conditional, failed, or unreviewed state.

## Graph labels and hover behavior

Graph labels now prefer these positions in order:

1. centered above the circle;
2. above and shifted right;
3. above and shifted left;
4. below only when no top position fits.

Hovered and selected labels enlarge and receive a type-colored outline.

Hover cards now prefer the area below and to the side of the cursor, then flip when near an edge. This keeps the enlarged label above the circle visible rather than placing the hover card directly over it.

The **Labels** toolbar button still cycles label scale. Inspector controls still provide:

```text
A−    A+    690px
```

for text size and panel width.

## Wikipedia-style definitions

The **Definition** tab shows:

- the canonical definition from the selected note;
- fallback text from `Research/03 Glossary/WCT Glossary.md`;
- cross-paper synthesis;
- related definition cards;
- typed semantic relationships;
- exact concept-name mentions inferred from the note text;
- clickable navigation without leaving the graph.

Inferred mentions are labeled as inferred. They are not silently promoted to canonical typed relations.

## Equations and derivations

The **Equations** and **Derivations** tabs connect objects through:

- ordinary Obsidian links;
- `derives`;
- `derived-from`;
- `depends-on`;
- shared canonical equation IDs;
- imported PDF page-provenance objects.

Recommended metadata:

```yaml
relations:
  derives:
    - Research/04 Equations/E24
  depends-on:
    - Research/02 Concepts/Sobolev Embedding
```

A PDF derivation object additionally records:

```yaml
source_kind: pdf
source_pages: "12-15"
human_verified: false
canonical_latex_verified: false
```

## Completion and validation

Each object has separate indicators:

- **Research completeness** — required fields and relationships for its semantic type;
- **Validation completion** — weighted closure across four validation dimensions;
- **Validation coverage** — how many validation dimensions have any recorded state;
- **Priority** — action urgency based on incompleteness, validation gaps, audit severity, centrality, contradiction state, type, and optional explicit priority.

These percentages are workflow metrics, not probabilities that a claim or equation is true.

| Validation state | Completion weight |
|---|---:|
| PASS | 100% |
| EMPIRICAL | 85% |
| CONDITIONAL | 60% |
| DEFINITION | 35% |
| OPEN | 15% |
| UNTESTED | 10% |
| UNREVIEWED | 0% |
| FAIL / CONTRADICTED | 100% resolved, while visibly marked failed or contradicted |

An optional manual priority can be recorded:

```yaml
priority_value: 80
```

It influences but does not replace automatic diagnostics.

## Research-browser tabs

- **Overview** — completion, priority, summary, identity, chronology, validation, connections, and audits.
- **Priority** — current state, missing work, action score, reasons, checklist, and validation dimensions.
- **Definition** — canonical definition, synthesis, linked concepts, and inferred concept mentions.
- **Equations** — rendered mathematics, repository families, formal mappings, and derivation links.
- **Derivations** — PDF import state, source pages, extracted derivations, and linked equations.
- **Papers** — paper appearances and connected paper objects.
- **Links** — typed outgoing relations and ordinary links.
- **Backlinks** — typed incoming relations and ordinary backlinks.
- **Properties** — readable frontmatter with Unicode normalization.
- **Repositories** — mappings to `geometry_of_resonance`, `wct-sympy`, and `wct-lean`.
- **All** — principal sections in one scrollable view.
- **Source** — the complete note rendered as Markdown and LaTeX.

Each tab has object-local search.

## Commands

- `WCT Graph Engine: Open WCT Graph`
- `WCT Graph Engine: Open WCT Research Audit`
- `WCT Graph Engine: Open WCT Idea Timeline`
- `WCT Graph Engine: Open WCT Priority Table and Bubble-Up`
- `WCT Graph Engine: Import PDF Derivations`
- `WCT Graph Engine: Re-import All PDF Derivations`
- `WCT Graph Engine: Open PDF Derivation Import Report`

## Main graph controls

- **Full graph** — complete clustered corpus.
- **Audit** — closure audit, including PDF papers whose derivations have not been imported.
- **Timeline** — creation-date timelapse and force view.
- **Priority** — bubble-up graph plus searchable state table.
- **Labels** — graph-label scale.
- Click a category node or label to enter it.
- Click a note to open the research browser.
- Double-click a note or choose **View connections** for a recursive local graph.
- Use **Back** or breadcrumbs to unwind.
- Drag empty space to pan.
- Scroll to zoom.
- **Fit** frames the scene.
- **Motion** cycles Full, Reduced, and Off.
- **Rebuild** refreshes metadata, links, current states, scores, and generated objects.

## Stable object identity

Existing frontmatter IDs are treated as stable identifiers. Objects without an explicit ID receive a temporary type-prefixed path hash and appear in the audit as **Objects missing stable IDs**.

Permanent compiler identities should use forms such as:

```text
DEF-000143
EQ-000082
DRV-PDF-04A63D291C
CLA-000051
EXP-000017
REF-000489
THM-000004
```

## Semantic generated-object filter

`WaveLock Research/Objects`, `WaveLock Research/Artifacts`, and the `Research` tree are indexed together.

The semantic filter suppresses obvious extraction noise such as single letters, author metadata, aliases, generic headings, and unqualified sentence fragments. Generated PDF derivations are retained because they have explicit `type: derivation`, stable IDs, page provenance, and source relations.

## Relationship to Research Compiler V4

WCT Graph Engine is the human-facing browser and local PDF-ingestion bridge. The canonical object registry, assertion store, provenance history, heterogeneous ingestion, semantic extraction, and entity resolution remain the larger responsibility of WaveLock Research Compiler V4.

Version 0.8 does not claim that extracted PDF text is a proof or that workflow completion is scientific confidence. It exposes the source, state, uncertainty, and missing work so those distinctions remain visible.

## Other graph plugins

Extended Graph and Graph Presets may remain installed for Obsidian's built-in Graph View. The older WCT Motion, Navigator, Polish, Pointer Fix, Content Details, and Panel Isolation plugins should remain disabled.
