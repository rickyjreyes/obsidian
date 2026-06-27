---
id: MAP-WAVELOCK-RESEARCH-COMPILER-V4
type: map
title: WaveLock Research Compiler V4
aliases:
  - Semantic Research Compiler
  - Research Knowledge Graph Compiler
created: 2026-06-27
status: canonical-design
schema_version: 4
supersedes:
  - MAP-RESEARCH-COMPILER-V2
---

# WaveLock Research Compiler V4 — Semantic Research Compiler & Research Knowledge Graph

## Mission

Build a compiler that transforms an entire scientific research corpus into a normalized semantic knowledge graph.

The compiler should understand scientific literature rather than simply parse Markdown.

Its purpose is to continuously ingest papers, PDFs, LaTeX, BibTeX, Zotero libraries, Obsidian notes, repositories, patents, experiments, datasets, and formal mathematics and convert them into persistent, versioned research objects with explicit semantic relationships.

**WaveLock Research becomes the canonical research database for the WaveLock ecosystem.**

---

## Guiding philosophy

Treat research exactly like software.

```text
Source code
↓
Compiler
↓
Abstract syntax tree
↓
Optimization
↓
Executable
```

```text
Research
↓
Semantic compiler
↓
Research ontology
↓
Knowledge graph
↓
Research database
↓
Research dashboard
↓
Publications
```

The compiler must preserve the distinction between:

- source text;
- extracted candidates;
- canonical research objects;
- inferred relationships;
- human-reviewed conclusions;
- formal or experimental validation.

No machine-generated interpretation may overwrite source evidence or masquerade as scientific validation.

---

# Input sources

Support native ingestion of:

- Markdown;
- PDF;
- DOCX;
- LaTeX;
- BibTeX;
- CSL JSON;
- RIS;
- Zotero exports;
- Crossref metadata;
- Zenodo records;
- arXiv papers;
- Git repositories;
- Lean repositories;
- SymPy repositories;
- Jupyter notebooks;
- CSV;
- JSON;
- YAML;
- images;
- SVG;
- experimental datasets;
- patent documents;
- website pages.

The compiler must never depend on Markdown alone.

Every ingested source receives an immutable source-artifact identity, content hash, acquisition timestamp, media type, parser version, and origin locator.

---

# PDF intelligence

PDFs are first-class citizens.

The compiler should extract:

- title;
- abstract;
- sections;
- headings;
- paragraphs;
- footnotes;
- captions;
- tables;
- figures;
- equations;
- references;
- appendices;
- algorithms;
- pseudocode;
- glossary terms;
- supplementary or appendix material.

OCR should be used only when embedded text is unavailable or unreliable.

The parser must preserve:

- page number;
- bounding box or document coordinates;
- reading order;
- section hierarchy;
- figure and table anchors;
- source text span;
- extraction method;
- OCR confidence where applicable.

A rendered PDF page and the extracted semantic object must remain mutually traceable.

---

# Citation intelligence

Do not merely collect references. Understand citation intent.

Detect relations such as:

- supports;
- extends;
- uses;
- contradicts;
- compares;
- reproduces;
- criticizes;
- validates;
- motivates.

Examples:

```text
“This follows Einstein (1905).”
↓
SUPPORTS
```

```text
“This disagrees with Smith et al.”
↓
CONTRADICTS
```

```text
“This extends Jones.”
↓
EXTENDS
```

Citation-intent edges must record:

- citing object;
- cited reference;
- relation type;
- exact source sentence;
- surrounding paragraph;
- page and coordinates;
- parser version;
- confidence;
- review state.

Uncertain intent must remain an unresolved candidate rather than being promoted as fact.

---

# Equation intelligence

Every equation becomes a persistent object.

```text
EQ-XXXX
```

Fields:

- canonical name;
- rendered LaTeX;
- raw LaTeX;
- symbolic abstract syntax tree;
- variables;
- symbols;
- units;
- dimensions;
- assumptions;
- dependencies;
- derived from;
- referenced by;
- appears in;
- proof status;
- Lean status;
- SymPy status;
- physical status;
- experimental support;
- counterexamples;
- confidence;
- version history;
- provenance.

The compiler should detect repeated or equivalent equations across papers using:

1. normalized LaTeX;
2. symbolic AST comparison;
3. alpha-renaming of variables;
4. commutative and algebraic normalization;
5. dimensional compatibility;
6. context and equation-label matching;
7. human-reviewable equivalence evidence.

Equivalent equations share one canonical object while preserving every appearance and notation variant.

---

# Definition intelligence

Every scientific concept becomes a canonical definition.

No duplicate semantic objects should be created for aliases or notation variants.

Example:

```text
Curvature Operator
Wψ
Normalized Curvature Operator
↓
one canonical definition
```

Every occurrence references the same object.

A definition object should contain:

- canonical term;
- aliases;
- symbols;
- plain-language definition;
- mathematical definition;
- scope;
- assumptions;
- first appearance;
- source passages;
- related equations;
- related claims;
- related experiments;
- superseded definitions;
- ambiguity notes;
- review state.

Section headings, metadata keys, sentence fragments, author names, and citation text must never be promoted as definitions merely because of their position in a document.

---

# Semantic claim extraction

Extract claims directly from prose.

Examples:

```text
“The resonance remains stable.”
↓
Claim
```

```text
“Mass emerges from confinement.”
↓
Claim
```

```text
“This predicts…”
↓
Prediction
```

```text
“This experiment confirms…”
↓
Validation statement
```

The parser must distinguish:

- claim;
- hypothesis;
- prediction;
- observation;
- conclusion;
- speculation;
- open question;
- assumption;
- limitation;
- falsifier.

Every extracted statement must preserve modality and certainty. “May,” “suggests,” “demonstrates,” and “proves” are not equivalent.

Claim confidence must remain separate from extraction confidence and separate again from scientific support.

---

# Experiment intelligence

Extract complete experimental structure:

- prediction;
- equipment;
- variables;
- protocol;
- controls;
- measurements;
- figures;
- raw data;
- statistical analysis;
- conclusions;
- replication status;
- linked claims;
- linked equations;
- linked simulations;
- environmental conditions;
- calibration records;
- uncertainty model;
- failure conditions;
- data and code locations.

An experiment object must make it possible to determine:

- what was predicted;
- what was changed;
- what was measured;
- what controls were used;
- what result was observed;
- how uncertainty was treated;
- whether the result is reproducible;
- which claim the experiment supports or challenges.

---

# Figure intelligence

Every figure becomes searchable.

```text
FIG-XXXX
```

Fields:

- caption;
- figure number;
- source paper;
- source page;
- bounding box;
- image asset;
- OCR text;
- labels and legend;
- referenced equations;
- referenced experiments;
- referenced claims;
- table or panel structure;
- image embeddings;
- provenance;
- version history.

Multi-panel figures should preserve both the parent figure and individual panel identities.

---

# Mathematical ontology

Support:

- definitions;
- symbols;
- variables;
- constants;
- assumptions;
- equations;
- identities;
- inequalities;
- boundary conditions;
- initial conditions;
- lemmas;
- theorems;
- corollaries;
- proofs;
- counterexamples;
- formalizations;
- dependencies;
- domains;
- dimensions;
- units.

Mathematical dependencies must be directional and provenance-bearing.

---

# Research object model

Persistent object classes:

```text
DEF   Definition
EQ    Equation
SYM   Symbol
CLA   Claim
PRED  Prediction
EXP   Experiment
REF   Reference
PAPER Paper
PAT   Patent
SIM   Simulation
FIG   Figure
TABLE Table
DATA  Dataset
TASK  Research task
THM   Theorem
LEM   Lemma
COR   Corollary
REP   Repository
CODE  Code artifact
PROOF Proof
OBS   Observation
HYP   Hypothesis
OQ    Open question
ART   Source artifact
```

Every object has:

- UUID;
- stable human-readable ID;
- semantic type;
- schema version;
- object version;
- canonical title;
- aliases;
- provenance;
- confidence dimensions;
- source documents;
- relationships;
- validation state;
- history;
- human review state;
- content hash;
- created and modified timestamps.

Stable IDs are never reused. Renaming files or changing display titles must not change object identity.

---

# Relationship graph

Support typed edges such as:

```text
Definition → Equation
Equation → Definition
Equation → Paper
Equation → Experiment
Claim → Evidence
Claim → Contradiction
Prediction → Experiment
Reference → Claim
Reference → Equation
Reference → Paper
Figure → Experiment
Figure → Equation
Simulation → Prediction
Repository → Paper
Paper → Patent
Patent → Claim
Concept → Definition
Theorem → Lemma
Lemma → Definition
Proof → Theorem
```

Canonical relation vocabulary includes:

```text
DEFINES
DEFINED_BY
USES
USED_BY
DERIVES
DERIVED_FROM
DEPENDS_ON
PREDICTS
PREDICTED_BY
TESTS
TESTED_BY
SUPPORTS
SUPPORTED_BY
CONTRADICTS
CITES
EXTENDS
REFINES
IMPLEMENTS
IMPLEMENTED_BY
REPRODUCES
VALIDATES
MOTIVATES
COMPARES_WITH
CRITICIZES
EQUIVALENT_TO
SUPERSEDES
APPEARS_IN
EXTRACTED_FROM
```

Every relationship has:

- source object;
- target object;
- relation type;
- provenance;
- confidence;
- extraction method;
- review state;
- validity interval or version range where applicable.

---

# Provenance

Every field records:

- origin document;
- source artifact ID;
- page;
- paragraph;
- sentence;
- character offsets;
- document coordinates when available;
- timestamp;
- parser version;
- model version when model-assisted;
- confidence score;
- human edits;
- transformation history.

Nothing should lose traceability.

Human edits must be layered as reviewed assertions and must not erase extracted evidence.

---

# Compiler architecture

```text
Ingestion adapters
↓
Immutable source-artifact store
↓
Format parsers
↓
Document intermediate representation
↓
Candidate extractors
↓
Semantic classifiers
↓
Mathematical and citation parsers
↓
Entity resolution and canonicalization
↓
Research object registry
↓
Typed relationship graph
↓
Validation and diagnostic passes
↓
Materialized outputs and dashboards
```

## Required intermediate layers

### Source artifact

The immutable bytes or exact textual snapshot that entered the system.

### Document IR

A normalized representation of pages, blocks, headings, paragraphs, equations, figures, tables, references, and coordinates.

### Candidate object

A possible definition, equation, claim, experiment, reference, or relation that has not yet passed canonicalization and review gates.

### Canonical object

A persistent object with stable identity and merged provenance.

### Assertion

A field value or relationship with provenance, confidence, author, and review state.

The graph should store assertions rather than pretending that every extracted field is unquestionably true.

---

# Object lifecycle

```text
INGESTED
→ PARSED
→ CANDIDATE
→ MATCHED or NEW
→ CANONICALIZED
→ REVIEWED
→ VALIDATED
→ SUPERSEDED or RETIRED
```

Rejected candidates remain auditable and must not silently disappear.

Reprocessing the same unchanged source must be idempotent: it must not create duplicate objects or duplicate relationships.

---

# Confidence model

Track independently:

```yaml
extraction_confidence:
classification_confidence:
entity_resolution_confidence:
relation_confidence:
source_quality:
symbolic_status:
formal_status:
physical_status:
experimental_status:
replication_status:
human_review_status:
```

A high extraction confidence does not imply that the scientific claim is correct.

---

# Compiler diagnostics

Detect:

- duplicate concepts;
- duplicate equations;
- missing references;
- broken citations;
- undefined symbols;
- unused definitions;
- circular dependencies;
- weak evidence;
- contradictions;
- unverified claims;
- missing experiments;
- incomplete proofs;
- missing figures;
- unlinked repositories;
- orphan datasets;
- claims without falsifiers;
- experiments without controls;
- equations without dimensions;
- formal declarations without source-equation links;
- papers without provenance-complete references.

Generate actionable diagnostics rather than simple warnings.

Each diagnostic should include:

- affected objects;
- severity;
- reason;
- provenance;
- recommended next action;
- whether it can be repaired automatically;
- validation required after repair.

---

# Research completion metrics

Measure scientific completeness across:

- definitions;
- equations;
- claims;
- predictions;
- experiments;
- validation;
- replication;
- formal proofs;
- code;
- repositories;
- references;
- figures;
- datasets;
- citation coverage;
- ontology coverage;
- graph connectivity;
- evidence strength;
- contradiction resolution;
- reproducibility;
- publication readiness;
- patent readiness.

Each metric must explain why it is incomplete and identify the objects responsible for the missing score.

A score without an auditable explanation is invalid.

---

# Dashboard

Provide a live Research Command Center containing:

- research health;
- knowledge graph;
- corpus statistics;
- weakest areas;
- contradictions;
- open questions;
- suggested next tasks;
- recent literature;
- claim confidence;
- experiment status;
- formal proof progress;
- repository coverage;
- publication readiness;
- patent readiness;
- ontology health;
- graph connectivity;
- unresolved review queue;
- provenance coverage;
- parser and compiler health.

Every dashboard card must link back to the affected canonical objects and source evidence.

---

# Obsidian integration

Generate clean, human-readable notes.

Support:

- Dataview;
- Canvas;
- Graph View;
- Properties;
- callouts;
- aliases;
- LaTeX;
- stable IDs;
- typed links;
- backlinks;
- tabbed object views;
- object-local search;
- repository mappings;
- validation state;
- provenance panels.

Requirements:

- no sentence fragments;
- no metadata masquerading as concepts;
- no duplicate semantic objects;
- no raw parser noise in the canonical graph;
- no broken identity when a filename changes;
- no hidden machine-generated claims.

Obsidian is a human-facing projection of the research database, not the canonical storage engine itself.

---

# Storage and outputs

Canonical machine-readable outputs should include:

```text
registry/objects.jsonl
registry/assertions.jsonl
registry/relations.jsonl
registry/aliases.jsonl
registry/provenance.jsonl
registry/versions.jsonl
registry/review_queue.jsonl
registry/diagnostics.jsonl
registry/id_counters.json
artifacts/
document_ir/
objects/
figures/
tables/
datasets/
reports/
```

Recommended database layers:

- object and assertion store;
- graph index;
- full-text search index;
- vector index for semantic retrieval;
- artifact/blob store;
- immutable event log.

Every generated Obsidian note, dashboard, API response, and publication export should be reproducible from the canonical registry.

---

# Model-assisted semantics

Language or vision models may assist with:

- claim classification;
- citation-intent classification;
- definition extraction;
- figure interpretation;
- entity resolution;
- relation suggestions;
- summarization;
- diagnostic recommendations.

Model outputs must always record:

- model name and version;
- prompt or task template version;
- source evidence;
- confidence;
- deterministic post-processing;
- review state.

Models may propose canonical changes but must not silently rewrite reviewed objects.

---

# Versioning and reproducibility

The compiler must support:

- immutable object history;
- schema migrations;
- parser-version migrations;
- reproducible rebuilds;
- source-content hashes;
- deterministic IDs or centrally allocated stable IDs;
- rollback;
- comparison between compiler runs;
- preservation of legacy IDs as aliases;
- explicit supersession rather than deletion.

A full compiler run must emit a manifest containing source hashes, parser versions, model versions, schema version, output hashes, and diagnostic totals.

---

# Acceptance tests

The architecture is not complete until these pass:

1. Renaming a source file does not break canonical identity.
2. Reingesting an unchanged corpus creates no duplicate objects or edges.
3. Equivalent equations written with renamed symbols resolve to one canonical equation with separate appearances.
4. Citation text is classified as a reference, not a definition.
5. Generic headings and metadata keys never become canonical concepts.
6. Every canonical field can be traced to source evidence or an explicit human assertion.
7. Every inferred relation exposes its source sentence and confidence.
8. Every PDF equation can be traced to page and coordinates.
9. Every claim exposes support, contradiction, confidence, and falsifier state where available.
10. Every experiment exposes prediction, protocol, controls, measurements, data, and replication state.
11. Every Lean or SymPy object links to its canonical equation or theorem.
12. Every dashboard metric explains its deficits at object level.
13. Human corrections survive reingestion and parser upgrades.
14. Superseded objects remain historically traceable.
15. The complete graph can be rebuilt from the source-artifact store and compiler manifest.

---

# Implementation phases

## Phase 1 — Canonical registry and provenance

- stable IDs;
- source-artifact store;
- object, assertion, relation, and provenance schemas;
- deterministic reingestion;
- legacy-object migration;
- diagnostics for duplicates and broken identity.

## Phase 2 — Document intermediate representation

- Markdown, PDF, DOCX, LaTeX, bibliography, and repository adapters;
- page and coordinate preservation;
- equation, figure, table, citation, and section blocks;
- OCR fallback.

## Phase 3 — Semantic object extraction

- definitions;
- equations;
- claims and modality;
- predictions;
- experiments;
- references;
- figures and tables;
- review queue.

## Phase 4 — Canonicalization and relationship graph

- alias resolution;
- equation equivalence;
- citation intent;
- typed relationships;
- contradiction detection;
- source-to-object and object-to-object provenance.

## Phase 5 — Formal and executable integration

- `wct-sympy` registry synchronization;
- `wct-lean` declaration synchronization;
- notebook, simulation, code, and dataset linkage;
- executable diagnostics.

## Phase 6 — Research Command Center

- live completeness metrics;
- graph and ontology health;
- experiment and proof status;
- publication and patent readiness;
- actionable next-task generation;
- Obsidian projections and public exports.

---

# Long-term vision

WaveLock Research is not a note-taking application.

It is a semantic compiler for scientific knowledge.

Its purpose is to continuously transform heterogeneous research artifacts into a living, versioned, queryable knowledge graph where every definition, equation, theorem, claim, prediction, experiment, proof, repository, reference, dataset, figure, and publication has identity, provenance, validation, relationships, and measurable completeness.

The compiler should understand research—not merely parse documents.
