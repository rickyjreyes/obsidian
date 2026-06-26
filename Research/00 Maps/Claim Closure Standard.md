---
type: research-standard
program: Wave Confinement Theory
---

# Claim Closure Standard

A WCT claim is represented as a traceable object rather than a sentence isolated inside a paper.

## Required fields

Every major claim note must contain:

1. **Plain definition** — what is being claimed without undefined symbols.
2. **Scope** — exact domain, approximation, geometry, model, and boundary conditions.
3. **Assumptions** — mathematical and physical premises used before the first inference.
4. **Symbol table** — every variable, operator, index, unit, and normalization.
5. **Canonical equation** — the minimal symbolic statement of the claim.
6. **Derivation path** — each transformation with no omitted logical bridge.
7. **Worked example** — one explicit numerical or low-dimensional realization.
8. **Dependencies** — prior equations, concepts, papers, and code modules.
9. **Prediction** — a quantity that can be measured or computed independently.
10. **Falsifier** — an outcome incompatible with the scoped claim.
11. **Evidence record** — simulation, observation, replication, null result, or unresolved test.
12. **Status** — one controlled status from the table below.
13. **Next closure step** — the smallest action that most reduces uncertainty.

## Controlled status vocabulary

| Status | Meaning |
|---|---|
| `defined` | Terms and scope are explicit, but no derivation is complete. |
| `derived-conditionally` | The result follows from stated assumptions inside a specified model. |
| `proved` | A complete mathematical proof exists for the stated theorem and hypotheses. |
| `implemented` | Code directly represents the stated equations. |
| `simulated` | Numerical output has been generated under documented parameters. |
| `predicted` | A prospective measurable outcome is specified before testing. |
| `reported-observation` | An observation is reported but not yet independently replicated. |
| `independently-replicated` | An independent group or apparatus reproduced the result. |
| `corroborated` | External work supports part of the mechanism without reproducing the full claim. |
| `phenomenological` | The relation models data but is not yet derived from the core theory. |
| `fitted` | Parameters were selected from the target data. |
| `falsified` | A valid test produced an incompatible result. |
| `unresolved` | Evidence or derivation is insufficient for classification. |

## Prohibited substitutions

Do not treat the following as equivalent:

- simulation and experiment;
- consistency and validation;
- a fitted constant and a derived constant;
- a model-relative complexity separation and unrestricted classical $P\ne NP$;
- reported observation and independent replication;
- structural analogy and derivation;
- chronology and proof;
- lack of peer review and falsity;
- citation count and scientific merit.

## Closure score

For prioritization, define ten binary fields:

$$
C= D+A+S+R+I+P+F+E+X+N,
$$

where:

| Symbol | Field |
|---|---|
| $D$ | definitions complete |
| $A$ | assumptions explicit |
| $S$ | symbols and units complete |
| $R$ | derivation complete |
| $I$ | implementation traceable |
| $P$ | quantitative prediction present |
| $F$ | falsifier explicit |
| $E$ | evidence attached |
| $X$ | external audit completed |
| $N$ | next action defined |

Thus $0\le C\le10$. The score measures documentation and closure, not truth.

## Audit rule

Any status change must cite the exact derivation note, code commit, dataset, protocol, or external source that justifies the change.
