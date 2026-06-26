---
type: literature-note
title: "P vs NP in Curvature-Bounded Wave Computation: A Model-Relative P_WCC ≠ NP_WCC Separation"
aliases:
  - "P vs NP in Curvature-Bounded Wave Computation: A Model-Relative P_WCC ≠ NP_WCC Separation"
citekey: "reyesVsNPCurvatureBounded2025"
authors: "Richard J. Reyes"
date: "2025-05-07"
year: "2025"
item_type: "preprint"
publisher: "Zenodo"
doi: "10.5281/zenodo.17743607"
zenodo_record: "https://zenodo.org/records/17743607"
pdf_url: "https://zenodo.org/records/17743607/files/P%20v.%20NP.pdf"
categories:
  - "Computation & Cryptography"
tags:
  - "literature-note"
  - "collection/computation-&-cryptography"
---

# P vs NP in Curvature-Bounded Wave Computation: A Model-Relative P_WCC ≠ NP_WCC Separation

> [!info] Preprint
> **Author:** Richard J. Reyes  
> **Date:** 2025-05-07  
> **Citation key:** `reyesVsNPCurvatureBounded2025`  
> **DOI:** [10.5281/zenodo.17743607](https://doi.org/10.5281/zenodo.17743607)  
> **Record:** [Open Zenodo record](https://zenodo.org/records/17743607)  
> **PDF:** [Open full-text PDF](https://zenodo.org/records/17743607/files/P%20v.%20NP.pdf)

## External links

- [GitHub repository](https://github.com/rickyjreyes/Wavelock)

## Overview

P vs NP in Curvature-Bounded Wave Computation: A Model-Relative P₍WCC₎ ≠ NP₍WCC₎ SeparationRichard J. Reyes - November 17, 2025(Original release: May 7, 2025)

## Concepts

- [[02 Concepts/Cook-Levin reduction|Cook-Levin reduction]]
- [[02 Concepts/Curvature complexity|Curvature complexity]]
- [[02 Concepts/Expander graphs|Expander graphs]]
- [[02 Concepts/Geometric complexity|Geometric complexity]]
- [[02 Concepts/Model-relative lower bounds|Model-relative lower bounds]]
- [[02 Concepts/NC Circuits|NC Circuits]]
- [[02 Concepts/NC1 circuits|NC¹ circuits]]
- [[02 Concepts/NP Verification|NP Verification]]
- [[02 Concepts/NP_WCC|NP_WCC]]
- [[02 Concepts/Non-natural proofs|Non-natural proofs]]
- [[02 Concepts/Non-relativizing arguments|Non-relativizing arguments]]
- [[02 Concepts/P vs NP|P vs NP]]
- [[02 Concepts/P_WCC|P_WCC]]
- [[02 Concepts/Wave Computation|Wave Computation]]
- [[02 Concepts/Wave Confinement Theory|Wave Confinement Theory]]
- [[02 Concepts/Wave Curvature Computation|Wave Curvature Computation]]

## Related papers

- [[01 Literature Notes/Classical P vs NP Is Ill-Posed|Classical P vs NP Is Ill-Posed]]
- [[01 Literature Notes/Wave-Constrained Computation and Turing Equivalence|Wave-Constrained Computation and Turing Equivalence]]
- [[01 Literature Notes/WaveLock One-Way Function|WaveLock One-Way Function]]
- [[01 Literature Notes/The Geometry of Resonance|The Geometry of Resonance]]
- [[01 Literature Notes/WCT and the Koide Mass Relation|WCT and the Koide Mass Relation]]

## Abstract / record description

P vs NP in Curvature-Bounded Wave Computation: A Model-Relative P₍WCC₎ ≠ NP₍WCC₎ SeparationRichard J. Reyes - November 17, 2025(Original release: May 7, 2025)

Github WaveLock: https://github.com/rickyjreyes/Wavelock

This paper develops a model-relative P vs NP program inside a curvature-regulated wave computation framework inspired by Wave Confinement Theory (WCT). Computation is modeled as the evolution of confined oscillatory states under curvature and entropy constraints. From this, the work defines a discrete Wave Curvature Computation (WCC) model and associated complexity classes P₍WCC₎ and NP₍WCC₎, obtained by bounding both evolution time and curvature resources.

On the analytic side, the manuscript introduces a semantic curvature-complexity measure CΘ(f) based on the WCT curvature operator Θ[ψ]. It then constructs a locked-expander family of 3-SAT instances and proves that any realization of this family inside the WCT curvature machine must pay exponential curvature cost

CΘ(Fₙ) ≥ 2^Ω(n)

yielding a non-natural, non-relativizing lower bound that excludes any polynomial-size, curvature-bounded WCC tiling for SAT within this specific curvature model. All such results are explicitly scoped to the WCT/WCC curvature machine and are not claimed as classical circuit lower bounds.

On the symbolic side, the paper gives a discrete Turing abstraction of WCT, encoding complex wavefields as finite-precision bitstrings and simulating each curvature-regulated update step by low-depth arithmetic circuits. A key result is that single WCC update steps lie in NC¹, implying P₍WCC₎ ⊆ P under standard encodings. The author constructs a purely symbolic NC¹ verifier for curvature-locked (coherence-verified) configurations and develops a Cook–Levin–style reduction from 3-SAT to a P₍WCC₎ wave-stability problem: SAT instances are mapped to symbolic wave/interference configurations that are accepted exactly when the corresponding clause structure is satisfied.

The manuscript then formulates a model-internal separation program: under explicit geometric and dynamical hypotheses (dimensional-lock curvature barriers and super-polynomial constructive depth), one would obtain an internal separation

P₍WCC₎ ⊊ NP₍WCT₎

at the level of the WCC/WCT model. This is presented as a conjectural program, not a completed proof: all unconditional separations and lower bounds are strictly inside the curvature-bounded WCT machine, and every link to the classical classes P and NP is framed as an explicit conditional template. In particular, any implication P ≠ NP would additionally require proving that ideal WCC machines and classical Turing machines simulate each other with only polynomial overhead; this compatibility hypothesis is not assumed or claimed in the paper.

The work also includes numerical experiments (CuPy-accelerated WCT simulations on growing grids) as qualitative motivation: certain coherent target states remain hard to reach under fixed step budgets as system size increases. These simulations are labeled as heuristic and illustrative only and are not used as part of any formal proof or lower-bound argument.

Key contributions (model-relative to WCT/WCC)

• Definition of a curvature-regulated wave computation model (WCC) and complexity classes P₍WCC₎ and NP₍WCC₎ under explicit rail constraints on curvature, entropy, and dimension.• Introduction of the curvature-complexity functional CΘ(f) and proof that certain expander-locked 3-SAT families require exponential curvature cost CΘ(Fₙ) ≥ 2^Ω(n) in the WCT curvature machine, giving a non-natural, non-relativizing analytic lower bound for SAT in this model.• Construction of a discrete symbolic WCT/WCC abstraction: finite-precision bit encodings, local curvature-regulated update rules, and a Turing-equivalent simulation template with per-step complexity in NC¹.• Design of an NC¹ verifier for curvature-locked configurations and a Cook–Levin–style reduction from 3-SAT to a P₍WCC₎ “wave-stability” problem, fully within a discrete symbolic setting.• Formulation of a dimensional-lock hypothesis and a time-hierarchy-style internal separation program (P₍WCC₎ ⊊ NP₍WCC₎) together with a conditional bridge showing how, if ideal WCC and Turing computation are polynomially equivalent, such an internal separation plus the curvature lower bound would imply the classical conjecture P ≠ NP.

Throughout, the manuscript does not claim an unconditional proof that P ≠ NP; it isolates a curvature-based, model-specific lower bound and a structured internal separation program, making all classical implications explicitly conditional.

Relation to previous WCT volumes

This paper is part of a larger Wave Confinement Theory program and builds on the formal and physical foundations developed in:

• The Geometry of Resonance: Wave Confinement Theory and the Emergence of Mass, Force, and Spacetime Richard J. Reyes, Zenodo 2025, DOI: 10.5281/zenodo.15356814

• Structure and Derivation of Physical Constants through Wave Confinement Richard J. Reyes, Zenodo 2025, DOI: 10.5281/zenodo.15341540

Those earlier works introduce the curvature-feedback Lagrangian, confinement rails, and operators such as Θ[ψ] that are here specialized to construct WCC curvature machines, define curvature complexity, and explore model-relative complexity separations.

## Research notes

### Main claim


### Evidence and method


### Open questions


### Connections

