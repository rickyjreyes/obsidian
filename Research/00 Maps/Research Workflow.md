---
type: workflow
program: Wave Confinement Theory
---

# Research Workflow

## 1. Capture

Every new paper, result, equation, observation, or idea enters the vault through one of four atomic note types:

- literature note;
- concept note;
- equation or derivation note;
- prediction or experiment note.

Do not leave important content only inside PDFs, chat logs, notebooks, or repository README files.

## 2. Normalize

Before linking a new object:

1. assign a canonical title;
2. define every new term;
3. standardize symbols and units;
4. identify aliases and duplicate concepts;
5. classify the object by research branch and evidence type.

## 3. Connect

Each object must link bidirectionally across the relevant layers:

$$
\text{paper}
\leftrightarrow
\text{concept}
\leftrightarrow
\text{equation}
\leftrightarrow
\text{derivation}
\leftrightarrow
\text{prediction}
\leftrightarrow
\text{experiment}.
$$

A paper note should never be the only place where an equation, prediction, or experimental claim exists.

## 4. Derive

For every central equation:

1. define symbols;
2. state the starting assumptions;
3. derive the equation line by line;
4. identify approximations;
5. provide one explicit worked example;
6. link the code implementation;
7. list unresolved mathematical gaps.

## 5. Operationalize

Convert derived claims into measurable form:

- predicted observable;
- units and expected scale;
- apparatus or public dataset;
- controls and null model;
- analysis method;
- statistical decision rule;
- falsification threshold.

## 6. Test

Each test note must preserve:

- prospective protocol or analysis plan;
- raw data location and checksum;
- calibration records;
- code version or commit;
- excluded data and reason;
- full result, including null outcomes;
- replication status.

## 7. Audit

Run four independent audits:

### Mathematical audit

Does the conclusion follow from the stated assumptions without an omitted bridge?

### Numerical audit

Does the implementation match the equations, converge under refinement, and survive parameter sensitivity checks?

### Experimental audit

Are controls, calibration, uncertainty, null models, and replication sufficient for the stated evidence class?

### Priority and originality audit

Which exact equation, mechanism, architecture, prediction, or integration was published first, and what prior art overlaps only partially?

## 8. Publish and preserve

A completed result should link:

- Obsidian source notes;
- LaTeX manuscript;
- GitHub code and commit;
- Zenodo or OSF release;
- DOI and citation metadata;
- ORCID record;
- experiment or dataset archive.

## 9. Reopen when contradicted

No note is permanently closed. New evidence must update:

- claim status;
- confidence and uncertainty;
- dependencies;
- contradiction log;
- next closure step.
