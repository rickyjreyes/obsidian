---
type: literature-note
title: "WaveLock: A Curvature-Locked One-Way Function Based on Nonlinear PDE Evolution"
aliases:
  - "WaveLock: A Curvature-Locked One-Way Function Based on Nonlinear PDE Evolution"
citekey: "reyesWaveLockCurvatureLockedOneWay2025"
authors: "Richard J. Reyes"
date: "2025-12-01"
year: "2025"
item_type: "preprint"
publisher: "Zenodo"
doi: "10.5281/zenodo.19122146"
zenodo_record: "https://zenodo.org/records/19122146"
pdf_url: "https://zenodo.org/records/19122146/files/wavelock_paper.pdf"
categories:
  - "Computation & Cryptography"
tags:
  - "literature-note"
  - "collection/computation-&-cryptography"
---

# WaveLock: A Curvature-Locked One-Way Function Based on Nonlinear PDE Evolution

> [!info] Preprint
> **Author:** Richard J. Reyes  
> **Date:** 2025-12-01  
> **Citation key:** `reyesWaveLockCurvatureLockedOneWay2025`  
> **DOI:** [10.5281/zenodo.19122146](https://doi.org/10.5281/zenodo.19122146)  
> **Record:** [Open Zenodo record](https://zenodo.org/records/19122146)  
> **PDF:** [Open full-text PDF](https://zenodo.org/records/19122146/files/wavelock_paper.pdf)

## External links

- [GitHub repository](https://github.com/rickyjreyes/Wavelock)

## Overview

This document introduces WaveLock, a cryptographic construction grounded in nonlinear partial differential equation (PDE) evolution within the Wave Confinement Theory (WCT) framework.

## Concepts

- [[02 Concepts/Curvature Invariants|Curvature Invariants]]
- [[02 Concepts/Curvature-based cryptography|Curvature-based cryptography]]
- [[02 Concepts/Deterministic dynamics|Deterministic dynamics]]
- [[02 Concepts/Entropy regularization|Entropy regularization]]
- [[02 Concepts/Geometric hashing|Geometric hashing]]
- [[02 Concepts/Nonlinear PDE evolution|Nonlinear PDE evolution]]
- [[02 Concepts/One-Way Functions|One-Way Functions]]
- [[02 Concepts/Post-Quantum Cryptography|Post-Quantum Cryptography]]
- [[02 Concepts/Wave Confinement Theory|Wave Confinement Theory]]
- [[02 Concepts/WaveLock|WaveLock]]
- [[02 Concepts/Wavefield commitment schemes|Wavefield commitment schemes]]

## Related papers

- [[01 Literature Notes/Logarithmic Curvature Flow and Lepton Masses|Logarithmic Curvature Flow and Lepton Masses]]
- [[01 Literature Notes/The Geometry of Resonance|The Geometry of Resonance]]
- [[01 Literature Notes/Classical P vs NP Is Ill-Posed|Classical P vs NP Is Ill-Posed]]
- [[01 Literature Notes/Model-Relative P_WCC vs NP_WCC|Model-Relative P_WCC vs NP_WCC]]
- [[01 Literature Notes/WCT and the Koide Mass Relation|WCT and the Koide Mass Relation]]

## Abstract / record description

This document introduces WaveLock, a cryptographic construction grounded in nonlinear partial differential equation (PDE) evolution within the Wave Confinement Theory (WCT) framework.

The work defines a deterministic curvature-driven evolution of a complex wavefield whose final state acts as a cryptographic commitment. The transformation from initial state to evolved configuration is computationally feasible in the forward direction but exhibits strong resistance to inversion, forming the basis of a one-way function.An open-source reference implementation is available at:https://github.com/rickyjreyes/Wavelock

By embedding geometric curvature functionals, entropy regularization, and nonlinear feedback into the evolution operator, the system produces high-dimensional outputs that are extremely sensitive to initial conditions while remaining fully deterministic and reproducible.

Core Result

The analysis demonstrates that nonlinear curvature evolution of a wavefield generates a commitment function of the form

ψ₀ → ψ★ → H(ψ★)

where ψ₀ is the initial state, ψ★ is the evolved curvature-locked configuration, and H is a canonical hash over curvature invariants and field structure.

Small perturbations in ψ₀ produce exponentially diverging ψ★ under evolution, while recovering ψ₀ from ψ★ requires solving a high-dimensional nonlinear inverse problem with no known efficient algorithm.

This establishes WaveLock as a curvature-based one-way function candidate grounded in continuous dynamics rather than discrete combinatorics.

Key Mathematical Structure

The construction follows the chain:

nonlinear wavefield initialization↓curvature–feedback operator↓entropy-regularized evolution↓nonlinear PDE dynamics↓deterministic forward evolution↓curvature-locked state ψ★↓canonical serialization↓cryptographic commitment.

The governing evolution combines gradient energy, curvature feedback, and entropy terms into a unified functional that drives the system toward stable high-complexity configurations.

Dimensional and Computational Constraints

The system enforces strict structural constraints on the wavefield:

ψ ∈ ℝ² with power-of-two spatial discretization

This ensures compatibility with spectral operators, deterministic evolution, and bounded computational regimes.

The framework introduces curvature-budget classifications (PWCC, NPWCC) that bound computational cost and define admissible evolution regimes, linking physical curvature constraints to computational complexity classes.

Scope and Interpretation

This work establishes the mathematical and computational structure of WaveLock as a curvature-based one-way function.

It does not claim:

a formal proof of cryptographic hardness,

reduction to standard assumptions (e.g., factoring, lattices),

or resistance against all quantum or future adversarial models.

Open problems include:

formal inversion hardness proofs,

tight complexity class characterization,

optimization of parameter regimes for security-performance tradeoffs,

analysis under adversarial and quantum attack models.

Relation to Prior Work

This manuscript builds on prior Wave Confinement Theory work on curvature operators, nonlinear wave dynamics, and geometric confinement.

The present contribution extends these ideas by:

constructing a deterministic PDE-based cryptographic primitive,

formalizing curvature evolution as a one-way transformation,

introducing commitment schemes based on wavefield invariants,

linking geometric evolution to computational irreversibility.

Significance

If the WaveLock construction is secure, it represents a new class of cryptographic primitives derived from continuous nonlinear dynamics rather than discrete algebraic structures.

The results suggest that cryptographic hardness may arise from geometric complexity and irreversible PDE evolution, opening a path toward physics-inspired cryptography and alternative post-quantum constructions.

## Research notes

### Main claim


### Evidence and method


### Open questions


### Connections

