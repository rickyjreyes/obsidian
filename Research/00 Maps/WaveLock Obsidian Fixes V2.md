---
type: implementation-specification
stable_id: MAP-WAVELOCK-OBSIDIAN-FIXES-V2
status: active
program: Wave Confinement Theory
applies_to: .obsidian/plugins/wct-graph-engine
priority: critical
---

# WaveLock Research / Obsidian Fixes V2
## Canonical Identity, Priority Integrity, Filtered Exports, and Graph Cleanup

Update the existing WaveLock Research Obsidian vault and the existing `.obsidian/plugins/wct-graph-engine` plugin. Do **not** create another plugin, another parallel object system, or a second priority engine.

The goal is to make the Obsidian graph and priority system trustworthy enough that:

1. every real research object has one canonical identity;
2. generated mirrors, navigation pages, headings, and PDF fragments do not compete with canonical research objects;
3. “scientifically important” is separated from “what should be worked on next”;
4. dependency chains are executed in blocker-first order;
5. every filtered export has correct, unique, explainable ranks;
6. SymPy, Lean, physical, and experimental validation remain independent;
7. the current graph navigation, equation rendering, hover details, tabs, timeline, and inspector continue working.

---

# Current Regression Evidence

The latest exports expose the following defects and must be used as regression fixtures:

- Canonical-only export: **1,001 included objects**.
- Of those, **511 are `Artifacts`**, even though many are mirrors of equations, glossary terms, references, or experiments.
- There are **274 exact-title collision groups** among included canonical objects, covering **557 rows**.
- At least **248 collisions are `Artifacts` versus `Glossary`**.
- The all-object export contains **4,793 rows**, but its largest displayed rank is **4,788**.
- The all-object export contains **665 duplicated rank values**, because included and excluded queues were apparently ranked independently and then merged.
- The excluded-only export contains **3,792 rows** and retains sparse global-looking ranks without explaining rank semantics.
- The PDF-review export contains **1,470 review candidates**, but starts at rank **1,929**, again without saying whether that is global rank, queue rank, or filtered rank.
- The top work list is dependency-inverted:
  - ME4 is rank 1 even though it is blocked by ME3.
  - ME3 is rank 5 even though it is blocked by ME2.
  - ME2 is rank 2 even though it is blocked by ME1.
  - ME1, the upstream root, is rank 7.
- E24 is stored under a generated `EQ-*` stable ID even though its canonical identity is `E24`.
- ME6B is stored under a generated `EQ-*` stable ID even though its canonical identity is `ME6B`.
- Artifact shadows of ME1–ME7, C1–C5, E24–E27, and E65–E70 still appear as separate canonical priority objects.
- Invalid or non-object nodes are still included as canonical objects, including:
  - `Experiments`
  - `03 Equations`
  - `ID — Equation title`
  - generic collection or index labels
- `Prediction Protocol Ledger` is classified as a canonical experiment even though it is a ledger/navigation object.
- A mojibake artifact appears as `╬öm2 precision` instead of `Δm² precision`.

Do not patch these examples individually. Fix the compiler and ranking rules that produced them.

---

# 1. Introduce a Canonicalization Prepass

Canonicalization must run before scoring, ranking, graph construction, search indexing, export, or dashboard counts.

## 1.1 Canonical identity precedence

Resolve identity in this order:

1. explicit frontmatter `stable_id`;
2. recognized canonical identifier in the title or filename, such as:
   - `ME1`–`ME8`
   - `ME6A`, `ME6B`
   - `C1`–`C5`
   - `E1`–`E82`
   - `CLE1`–`CLE10`
   - `CM1`–`CM20`
   - `TOP1`–`TOP9`
   - `CORR1`–`CORR6`
   - other approved corpus namespaces;
3. existing alias registry;
4. deterministic generated ID only when no canonical ID exists.

Required alias corrections include:

```text
EQ-8B21181B -> E24
EQ-71AAF63F -> ME6B
```

Do not allow a generated `EQ-*`, `OBJ-*`, `obj_*`, or `art_*` identity to replace a recognized canonical identity.

## 1.2 Canonical-object versus projection distinction

An artifact note is normally a projection, attachment, rendering, implementation record, or generated view of another object. It is not automatically a new research object.

Add fields:

```yaml
object_state: canonical | projection | navigation | generated | source-fragment | review-candidate | duplicate-candidate | rejected
canonical_id:
canonical_of:
projection_kind:
```

Rules:

- An artifact that mirrors a glossary term, equation, reference, experiment, paper, theorem, or claim must become `object_state: projection`.
- It must have `canonical_of: <stable-id>`.
- It must not receive its own primary priority rank.
- It may remain visible in an optional “projections/artifacts” graph overlay.
- It must not inflate object totals, phase totals, missing-field totals, or validation totals.
- A genuinely unique research artifact can remain canonical only when it has distinct content and no canonical parent.

## 1.3 Unicode and title normalization

Normalize identity keys with Unicode NFKC while preserving the original display title.

Normalize only for comparison:

- Unicode compatibility characters;
- repeated whitespace;
- hyphen/dash variants;
- escaped versus unescaped LaTeX;
- filename-safe substitutions;
- case where case is not scientifically meaningful.

Preserve scientific display forms such as:

```text
Δm²
ψ
∇²
n ≤ 3
B⁰ → K*⁰ μ⁺μ⁻
```

Repair mojibake where a lossless correction is identifiable. `╬öm2 precision` must resolve to the same canonical object as `Δm² precision`, not become another artifact.

## 1.4 Duplicate resolution

For each normalized title/alias collision:

1. prefer an explicit canonical stable ID;
2. merge provenance and relations into the canonical object;
3. retain source-note paths as appearances or projections;
4. record aliases;
5. never silently delete provenance;
6. flag unresolved scientific homonyms for review rather than merging them automatically.

Acceptance condition:

- No included canonical artifact may have the same normalized identity as an included canonical equation, glossary term, reference, experiment, paper, theorem, claim, prediction, or derivation.

---

# 2. Add a Classification Gate Before Inclusion

An object must pass classification validation before it can enter the primary research graph or priority queue.

## 2.1 Exclude structural text from canonical research types

The following are not canonical research objects unless explicitly authored as substantive objects:

- folder names;
- index titles;
- collection labels;
- navigation pages;
- section headings;
- table headings;
- bibliography headings;
- generic words such as `Papers`, `Experiments`, `References`, `Priority Queue`, or `Related papers`;
- templates such as `ID — Equation title`;
- source fragments such as `Abstract / record description`;
- filenames or path fragments.

These may be navigation or source-fragment nodes, but must not be canonical equations, experiments, predictions, claims, glossary terms, or theorems.

## 2.2 Type-specific minimum requirements

### Equation

Requires:

- canonical equation or operator;
- valid LaTeX or an explicit source transcription;
- defined symbols or links to symbol definitions;
- source/provenance;
- stable ID or review-candidate state.

### Experiment

Requires:

- research question or linked prediction;
- apparatus/materials or data source;
- protocol;
- measured observable;
- evidence/data location;
- result state;
- replication state;
- falsifier or decision criterion where applicable.

A ledger, protocol index, apparatus component, observable name, or broad topic is not itself a canonical experiment.

### Theorem

Requires:

- formal statement;
- assumptions;
- conclusion;
- proof/proof sketch/source;
- links to dependencies.

A paragraph containing the word “theorem” is not sufficient.

### Prediction

Requires:

- predictive statement;
- linked equation or model;
- measurable observable;
- test;
- falsifier;
- provenance.

### Contradiction

Requires:

- two explicit incompatible statements or statuses;
- source locations for both;
- contradiction class;
- resolution state.

### Glossary definition

Requires:

- canonical term;
- canonical definition;
- aliases;
- related equations/concepts;
- paper appearances.

A citation, heading, folder name, or filename is not a glossary definition.

---

# 3. Separate Scientific Rank from Work Priority

The current single score incorrectly mixes importance, confidence, urgency, and dependency into one list. Replace it with distinct concepts.

## 3.1 Required ranking fields

```yaml
scientific_importance:
scientific_rank:
work_priority:
work_queue_rank:
filtered_rank:
queue_state:
execution_tier:
blocked_by:
blocks:
```

### Scientific importance

Answers:

> How central or consequential is this object to the corpus?

It may rank ME4 above ME1 if ME4 is more scientifically consequential.

### Work priority

Answers:

> What should be worked on next?

It must respect unresolved blockers and actionability.

### Queue state

Use:

```text
ready
blocked
review
complete
excluded
```

The primary “Next Work” queue must show `ready` objects first. Blocked objects belong in a separate blocked queue.

## 3.2 Dependency-aware execution order

Build a directed dependency graph from `blocked_by` and `blocks`.

Calculate a topological `execution_tier`:

- tier 0: no unresolved hard blockers;
- tier 1: blocked only by tier-0 objects;
- tier 2: blocked by tier-1 objects;
- and so on.

Within the foundational master chain, the work queue must respect:

```text
ME1 -> ME2 -> ME3 -> ME4 -> ME6A -> ME6B -> ME7
```

Within the dimensionality chain, it must respect:

```text
ME4 -> E24 -> E25 -> E26 -> E27 -> E65 -> E66 -> E67 -> E68 -> E69 -> E70
```

A downstream object may remain scientifically important, but it must not appear above its unresolved hard blocker in “Next Work.”

## 3.3 Work-priority calculation

Only score eligible canonical objects.

Do not use confidence as a simple positive bonus. High confidence often means less review is needed.

Use components such as:

```text
importance
urgency
unresolved downstream impact
validation gap
completeness gap
actionability
review risk
```

Recommended behavior:

```text
eligible = canonical && included && classification_valid

queue_state =
  excluded  if !eligible
  complete  if all required work is complete
  blocked   if unresolved hard blockers exist
  review    if human verification is required before editing
  ready     otherwise
```

Sort the “Next Work” queue by:

1. queue state (`ready` before `review`, then `blocked`, then `complete`);
2. execution tier ascending;
3. unresolved downstream impact descending;
4. work priority descending;
5. stable ID ascending as deterministic tie-breaker.

Never allow generated fragments, projections, navigation pages, or duplicate candidates to outrank canonical work.

## 3.4 Do not let type defaults masquerade as object urgency

Urgency must be object-specific and explainable.

Do not assign every navigation page urgency 68, every generated equation urgency 70, or every PDF derivation urgency 60 merely because of type.

Add a score explanation:

```yaml
priority_reasons:
  - ...
priority_penalties:
  - ...
```

The inspector and export must show why a score was produced.

---

# 4. Correct Rank Semantics

Never overload one `Rank` field.

## 4.1 Global scientific rank

- Unique across all valid canonical research objects.
- Dense sequence `1..N`.
- Excludes projections, navigation, generated fragments, duplicates, and rejected objects.

## 4.2 Work-queue rank

- Unique across eligible work items.
- Dense sequence `1..M`.
- Based on queue state, execution tier, and work priority.
- Blocked and review queues may have their own ranks.

## 4.3 Filtered rank

- Recomputed for the active view/export.
- Dense sequence `1..K`.
- Never reuses ranks from another independently ranked list.
- Never creates duplicate rank numbers after merging filters.

All exports must include explicit columns:

```text
Scientific Rank
Work Queue Rank
Filtered Rank
```

Use blank or `—` when a rank is not applicable.

---

# 5. Fix Filtered Markdown Exports

Each export must be self-describing.

## 5.1 Export header

Include:

```markdown
# WCT Priority Export — <view name>

- Generated:
- Dataset version:
- Compiler version:
- Priority model version:
- Active filters:
- Object states:
- Included status:
- Object types:
- Phases:
- Validation filters:
- Search query:
- Sort:
- Rank semantics:
- Rows exported:
- Total objects before filter:
```

The title must not always be the generic `WCT filtered Priority Rank`.

Examples:

```text
WCT Priority Export — Canonical Included Objects
WCT Priority Export — Excluded and Review Objects
WCT Priority Export — PDF Review Queue
WCT Priority Export — All Objects
```

## 5.2 Export ordering

- Do not merge separately ranked arrays.
- Apply canonicalization.
- Build one record set.
- Calculate ranks once.
- Apply filters.
- Calculate filtered rank.
- Export in the current displayed order.

## 5.3 Complete copyable export

The Markdown export must contain the full selected result, not only currently virtualized or visible rows.

Also provide machine-readable exports from the same record set:

```text
Markdown
CSV
JSON
```

All formats must contain the same object count and IDs.

## 5.4 Export diagnostics

At the end of the export, include:

```markdown
## Diagnostics

- Duplicate canonical identities:
- Missing stable IDs:
- Invalid classifications:
- Projection objects:
- Navigation objects:
- Source fragments:
- Review candidates:
- Rank collisions:
- Dependency cycles:
- Validation conflicts:
```

A successful export must report `Rank collisions: 0`.

---

# 6. Validation Synchronization

Maintain independent validation axes:

```yaml
symbolic_status:
formal_status:
physical_status:
experimental_status:
overall_validation:
validation_sources:
validation_conflicts:
```

Rules:

- SymPy evidence can update symbolic status only.
- Lean evidence can update formal status only.
- Symbolic PASS must not imply formal, physical, or experimental PASS.
- Formal PASS must not imply physical or experimental PASS.
- `definition` is not equivalent to `pass`.
- `not-applicable` must not count as missing or failed.
- Conflicting statuses for the same canonical ID must create one visible validation conflict on the canonical object.
- Validation must be synchronized through the canonical alias registry, so E24 and ME6B do not split evidence across hashed aliases.

---

# 7. Correct the Phase Model

Identity and classification cleanup are compiler prerequisites, not late backlog work.

Use this order:

```text
Phase 0A — Canonical identity, Unicode, and duplicate cleanup
Phase 0B — Validation synchronization
Phase 1 — Foundational master chain
Phase 2 — Closure layer
Phase 3 — Dimensionality proof chain
Phase 4 — Equation implementation links
Phase 5 — Canonical experiment normalization
Phase 6 — PDF review paper by paper
Phase 7 — Remaining generated-fragment and classification cleanup
Phase 8 — General corpus backlog
```

Do not keep known identity errors waiting in Phase 7 if they corrupt every ranking and graph.

---

# 8. Graph and Inspector Behavior

Preserve the existing WCT Graph Engine and all working features.

Do not create a second graph plugin.

Required behavior:

- cards remain fully clickable;
- navigation that cannot return cleanly opens in a new tab where appropriate;
- navbar remains consistent across views;
- equations render as readable LaTeX;
- equation families link to actual equations and definitions;
- hover/inspector shows substantive definitions, not clipped one-line text;
- selected nodes do not force unnecessary scroll resets;
- the inspector remains readable at approximately 940 px;
- concept maps remain connected graph views;
- timeline retains a visible time scale;
- status colors remain distinct for PASS, CONDITIONAL, DEFINITION, OPEN, conflict, and unreviewed;
- canonical objects are primary nodes;
- projections/artifacts are hidden by default and available through an overlay toggle;
- duplicate candidates are visually distinct and never presented as independent validated discoveries.

Add graph filters for:

```text
canonical only
projections
navigation
review candidates
duplicates
object type
phase
queue state
validation axis/status
paper
stable ID
missing field
```

---

# 9. Required Regression Tests

Add automated tests using the current exports as fixtures.

## Identity and deduplication

1. E24 resolves to stable ID `E24`, not `EQ-8B21181B`.
2. ME6B resolves to stable ID `ME6B`, not `EQ-71AAF63F`.
3. Artifact mirrors of ME1–ME7 are projections, not primary canonical objects.
4. Artifact mirrors of C1–C5 are projections.
5. Artifact mirrors of E24–E27 and E65–E70 are projections.
6. `╬öm2 precision` resolves to the canonical `Δm² precision` object.
7. Exact canonical-title collision count after canonicalization is zero unless an explicit homonym exception exists.

## Classification

8. `Experiments` is navigation, not a canonical experiment.
9. `03 Equations` is navigation, not a canonical equation.
10. `ID — Equation title` is a template/navigation object.
11. `Prediction Protocol Ledger` is a ledger/navigation object, not an experiment.
12. A bibliography heading is not classified as a prediction, theorem, claim, or glossary definition.
13. Apparatus components do not become standalone canonical experiments.

## Priority and dependencies

14. The “Next Work” queue places ME1 before ME2, ME2 before ME3, and ME3 before ME4 while blockers remain unresolved.
15. Blocked objects do not appear above their unresolved blockers in the ready queue.
16. A high scientific rank does not automatically produce a high work-queue rank.
17. Confidence does not act as a blanket positive work-priority bonus.
18. Navigation and generated fragments never outrank canonical work.
19. Every score includes visible reasons and penalties.

## Rank integrity

20. All scientific ranks are unique and dense.
21. All work-queue ranks are unique and dense.
22. Every filtered export has filtered ranks `1..K`.
23. The all-object export has zero duplicate rank values.
24. Merging included and excluded records cannot produce rank collisions.
25. Deterministic tie-breaking produces identical ranks on repeated builds.

## Export integrity

26. Export title and metadata identify the active filter.
27. Exported row count equals the selected view count.
28. Markdown, CSV, and JSON exports contain the same stable IDs.
29. Full exports are not limited to rendered/virtualized rows.
30. Diagnostics report rank collisions, identity collisions, dependency cycles, and validation conflicts.

## Validation

31. SymPy PASS updates only symbolic status.
32. Lean PASS updates only formal status.
33. Symbolic or formal PASS does not update physical or experimental status.
34. `not-applicable` does not reduce completion.
35. Alias IDs share one canonical validation record.

## UI preservation

36. Existing graph navigation still works.
37. Existing hover and inspector behavior still works.
38. Equation rendering remains readable.
39. Timeline and tabs remain functional.
40. No additional Obsidian plugin is created.

---

# 10. Completion Criteria

The update is complete only when:

- canonicalization runs before ranking;
- artifact mirrors no longer compete as primary research objects;
- E24 and ME6B use their canonical stable IDs;
- malformed generic nodes are removed from canonical competition;
- scientific importance and next-work priority are separate;
- dependency order is respected;
- all rank fields have explicit semantics;
- all ranks are unique and deterministic;
- every export identifies its filters;
- all selected rows are exportable;
- validation axes remain independent;
- graph and inspector functionality are preserved;
- the regression test suite passes.

Do not report success only because the UI looks cleaner. Report before/after metrics for:

```text
total source records
canonical research objects
projection/artifact objects
navigation objects
generated fragments
review candidates
duplicate candidates
canonical identity collisions
rank collisions
dependency cycles
validation conflicts
objects missing stable IDs
objects missing provenance
objects missing required type fields
```

The expected result is not necessarily to preserve the current count of 1,001 included objects. The expected result is a smaller, cleaner, more truthful canonical set with projections and source fragments preserved outside primary competition.
