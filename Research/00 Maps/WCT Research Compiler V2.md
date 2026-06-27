---
id: MAP-RESEARCH-COMPILER-V2
type: map
created: 2026-06-27
status: design
---

# WCT Research Compiler V2

## Goal

Compile research documents into stable, typed, queryable knowledge objects rather than generating a note for every heading or phrase.

```text
Markdown / PDF / repository / dataset
↓
Tokenizer
↓
Syntactic parser
↓
Semantic classifier
↓
Canonical object registry
↓
Typed relation graph
↓
Validation and provenance passes
↓
Research database
↓
Obsidian graph, audit dashboard, and executable workflows
```

## Non-negotiable invariant

Every first-class object receives a permanent ID when it is created.

```text
DEF-000143
EQ-000082
CLA-000051
EXP-000017
REF-000489
THM-000004
PRD-000031
EVD-000090
CTR-000006
```

Links resolve through object IDs. Filenames and display titles may change without changing identity.

## Compiler stages

### 1. Ingestion

Inputs:

- Markdown notes
- PDFs
- LaTeX
- Git repositories
- SymPy registries
- Lean declarations
- experiment logs
- data files
- bibliography files

Output: source artifacts with immutable provenance IDs.

### 2. Tokenization

Recognize:

- headings
- prose sentences
- display equations
- inline equations
- wikilinks
- citations
- DOI and arXiv identifiers
- tables
- callouts
- code blocks
- experimental measurements
- theorem and proof markers
- validation status markers

### 3. Candidate extraction

Generate candidates without immediately promoting them to first-class objects.

```text
candidate_type
candidate_text
source_artifact_id
source_span
heading_context
local_links
confidence
```

### 4. Semantic classification

Allowed first-class object types:

- Definition
- Equation
- Claim
- Theorem
- Assumption
- Prediction
- Experiment
- Evidence
- Contradiction
- Reference
- Artifact
- Repository implementation
- Dataset
- Figure
- Parameter set

The classifier must distinguish content objects from document structure.

Never promote these alone:

```text
Introduction
Overview
Authors
Aliases
Comment
Family
Figure
Table
Appendix
Body
Sources
Research notes
Conclusion
Metadata
A
The
```

### 5. Canonicalization

Before issuing a new ID:

1. normalize title and symbols;
2. compare aliases;
3. compare equations structurally;
4. compare DOI, arXiv ID, title, and authors for references;
5. search the registry for equivalent objects;
6. merge or create;
7. preserve all source spans and aliases.

### 6. ID issuance

IDs are allocated by semantic type and never reused.

Minimum registry fields:

```yaml
id: EQ-000082
type: equation
canonical_title: Finite-band spectral extremum
aliases: []
created: 2026-06-27T00:00:00Z
created_by: compiler-v2
source_artifacts: []
source_spans: []
schema_version: 2
```

### 7. Typed relation extraction

Relations include:

```text
DEFINES
DEFINED_BY
DERIVES
DERIVED_FROM
USES
USED_BY
DEPENDS_ON
PREDICTS
PREDICTED_BY
TESTS
TESTED_BY
IMPLEMENTS
IMPLEMENTED_BY
SUPPORTS
SUPPORTED_BY
CONTRADICTS
CITES
REFINES
EXTENDS
EQUIVALENT_TO
SUPERSEDES
```

Every relation records provenance and confidence.

```yaml
source: EQ-000082
relation: DERIVED_FROM
target: THM-000004
confidence: 0.91
provenance:
  artifact: ART-000301
  span: lines 220-247
```

## Object schemas

### Definition

```yaml
id: DEF-000143
type: definition
term:
canonical_definition:
plain_language:
mathematical_definition:
symbols: []
aliases: []
introduced_by: []
used_by: []
related_equations: []
related_experiments: []
status:
```

### Equation

```yaml
id: EQ-000082
type: equation
label: E24
expression:
latex:
variables: []
dimensions: []
assumptions: []
depends_on: []
derived_from: []
used_by: []
proofs: []
simulations: []
experiments: []
papers: []
repositories: []
lean_status: OPEN
sympy_status: OPEN
physical_status: OPEN
experimental_status: UNTESTED
counterexamples: []
open_issues: []
```

### Claim

```yaml
id: CLA-000051
type: claim
statement:
status: OPEN
supporting_evidence: []
papers: []
experiments: []
simulations: []
formal_proofs: []
contradictions: []
confidence:
falsifier:
```

### Experiment

```yaml
id: EXP-000017
type: experiment
prediction:
equipment: []
procedure: []
expected_result:
observed_result:
data: []
figures: []
analysis: []
reproducibility:
status:
```

### Reference

```yaml
id: REF-000489
type: reference
title:
authors: []
year:
doi:
arxiv:
journal:
volume:
pages:
url:
bibtex:
cited_by: []
appears_in: []
related_equations: []
related_experiments: []
source_artifacts: []
```

### Theorem

```yaml
id: THM-000004
type: theorem
statement:
assumptions: []
proof:
formalization:
depends_on: []
used_by: []
counterexamples: []
status:
```

## Reference extraction rules

A candidate is likely a reference when it contains several of:

- author initials or surname lists;
- four-digit year;
- journal or publisher name;
- volume and page pattern;
- DOI;
- arXiv identifier;
- title followed by publication metadata.

Reference candidates must never be promoted to definitions solely because they occur after a `Definition` heading.

## Definition acceptance rules

A definition candidate must:

- name a scientific or technical concept;
- contain a definitional statement or be linked to one;
- not be only a section label;
- not be a citation;
- not be a metadata key;
- not be a single common word without domain meaning;
- pass alias and duplicate checks.

Examples accepted:

```text
Curvature Locking
Lyapunov Functional
Phase-Flux Field
Entropy Drop
Curvature Operator
```

Examples rejected:

```text
A
Authors
Aliases
Comment
Family
Introduction
Overview
Figure
```

## Equation extraction passes

1. Parse LaTeX into an AST.
2. Canonicalize symbol names and commutative ordering.
3. Identify equation labels such as M1, E24, CLE3, or CM12.
4. Extract nearby variable definitions.
5. infer or import physical dimensions.
6. connect assumptions and derivation spans.
7. connect paper appearances.
8. connect SymPy checks.
9. connect Lean declarations.
10. connect simulations, experiments, and counterexamples.

## Confidence and review

Compiler confidence does not equal scientific confidence.

Track separately:

```yaml
extraction_confidence:
classification_confidence:
relation_confidence:
symbolic_status:
formal_status:
physical_status:
experimental_status:
review_status:
```

Low-confidence candidates remain in a review queue and do not enter the canonical graph automatically.

## Required compiler outputs

```text
registry/objects.jsonl
registry/relations.jsonl
registry/aliases.jsonl
registry/provenance.jsonl
registry/review_queue.jsonl
registry/id_counters.json
objects/*.md
reports/extraction_report.json
reports/duplicate_report.json
reports/orphan_report.json
reports/schema_errors.json
```

## Obsidian integration

WCT Graph Engine consumes the compiler output but does not assign canonical scientific meaning itself.

The graph should support:

- stable-ID lookup;
- type filters;
- validation filters;
- creation-date timeline;
- provenance inspection;
- shortest and strongest semantic paths;
- audit queues;
- relation direction;
- equation, claim, experiment, and reference inspectors.

## Migration from current objects

1. Preserve every existing `obj_*` ID as a legacy alias.
2. Reclassify each object semantically.
3. Reject generic parser fragments.
4. merge duplicates.
5. issue permanent type-specific IDs.
6. rewrite relations to canonical IDs.
7. retain original filenames and source spans as provenance.
8. generate redirect notes only where needed.
9. validate that no source artifact becomes unreachable.
10. compare old and new object counts by type.

## Acceptance tests

The compiler is not complete until these pass:

- renaming an object file does not break any relation;
- `[[art_*]]` references resolve through artifact IDs;
- citations are classified as references rather than definitions;
- generic headings do not become objects;
- equivalent equations merge without losing provenance;
- every equation links to variables, assumptions, source papers, and validation state where available;
- every claim can expose support, contradiction, and falsifier state;
- every experiment exposes prediction, procedure, observation, data, and reproducibility state;
- every canonical object has exactly one permanent ID;
- the graph can replay object creation by date.
