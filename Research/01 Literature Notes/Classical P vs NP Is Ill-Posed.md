---
type: literature-note
title: "The Classical P vs NP Problem is Mathematically and Physically Ill-Posed"
aliases:
  - "The Classical P vs NP Problem is Mathematically and Physically Ill-Posed"
citekey: "reyesClassicalVsNP2025"
authors: "Richard J. Reyes"
date: "2025-12-01"
year: "2025"
item_type: "preprint"
publisher: "Zenodo"
doi: "10.5281/zenodo.17783074"
zenodo_record: "https://zenodo.org/records/17783074"
pdf_url: "https://zenodo.org/records/17783074/files/THE%20P%20vs%20NP%20PROBLEM%20IS%20NOT%20MATHEMATICAL.pdf"
categories:
  - "Computation & Cryptography"
tags:
  - "literature-note"
  - "collection/computation-&-cryptography"
---

# The Classical P vs NP Problem is Mathematically and Physically Ill-Posed

> [!info] Preprint
> **Author:** Richard J. Reyes  
> **Date:** 2025-12-01  
> **Citation key:** `reyesClassicalVsNP2025`  
> **DOI:** [10.5281/zenodo.17783074](https://doi.org/10.5281/zenodo.17783074)  
> **Record:** [Open Zenodo record](https://zenodo.org/records/17783074)  
> **PDF:** [Open full-text PDF](https://zenodo.org/records/17783074/files/THE%20P%20vs%20NP%20PROBLEM%20IS%20NOT%20MATHEMATICAL.pdf)

## External links

- [GitHub repository](https://github.com/rickyjreyes/Wavelock)

## Overview

This paper reframes the classical P vs NP problem from the standpoint of physical computation. The central claim is that real computation cannot be separated from geometry, energy, memory, distinguishability, and finite propagation. A Turing machine can idealize these costs away; a physical system cannot.

## Concepts

- [[02 Concepts/3-SAT|3-SAT]]
- [[02 Concepts/AGI Safety|AGI Safety]]
- [[02 Concepts/Computational Complexity|Computational Complexity]]
- [[02 Concepts/Curvature Capacity|Curvature Capacity]]
- [[02 Concepts/Curvature complexity|Curvature complexity]]
- [[02 Concepts/Curvature-Bounded Computation|Curvature-Bounded Computation]]
- [[02 Concepts/Distinguishability Curvature|Distinguishability Curvature]]
- [[02 Concepts/Distinguishability cost|Distinguishability cost]]
- [[02 Concepts/Finite precision|Finite precision]]
- [[02 Concepts/Finite-bandwidth computation|Finite-bandwidth computation]]
- [[02 Concepts/Geometric memory|Geometric memory]]
- [[02 Concepts/Locked expander|Locked expander]]
- [[02 Concepts/NP_WCC|NP_WCC]]
- [[02 Concepts/Nonlinear computation|Nonlinear computation]]
- [[02 Concepts/P vs NP|P vs NP]]
- [[02 Concepts/P_WCC|P_WCC]]
- [[02 Concepts/Physical Computation|Physical Computation]]
- [[02 Concepts/Physical P≠NP|Physical P≠NP]]
- [[02 Concepts/SAT|SAT]]
- [[02 Concepts/Symbolic physics|Symbolic physics]]
- [[02 Concepts/Turing Machines|Turing Machines]]
- [[02 Concepts/Turing Simulation|Turing Simulation]]
- [[02 Concepts/Wave Computation|Wave Computation]]
- [[02 Concepts/Wave Confinement Theory|Wave Confinement Theory]]
- [[02 Concepts/Wave Curvature Computation|Wave Curvature Computation]]
- [[02 Concepts/Wave-Encoded Information|Wave-Encoded Information]]

## Related papers

- [[01 Literature Notes/Model-Relative P_WCC vs NP_WCC|Model-Relative P_WCC vs NP_WCC]]
- [[01 Literature Notes/Wave-Constrained Computation and Turing Equivalence|Wave-Constrained Computation and Turing Equivalence]]
- [[01 Literature Notes/WaveLock One-Way Function|WaveLock One-Way Function]]
- [[01 Literature Notes/WCT and the Koide Mass Relation|WCT and the Koide Mass Relation]]
- [[01 Literature Notes/Resonance-Confinement Architecture|Resonance-Confinement Architecture]]

## Abstract / record description

This paper reframes the classical P vs NP problem from the standpoint of physical computation. The central claim is that real computation cannot be separated from geometry, energy, memory, distinguishability, and finite propagation. A Turing machine can idealize these costs away; a physical system cannot.

Using the Wave Confinement Theory computational model, Wave Curvature Computation (WCC), the manuscript studies what happens when symbolic computation is forced to obey curvature, locality, finite precision, finite bandwidth, and physical distinguishability constraints.

Core Question

Can NP-style witness search remain physically realizable when every stored bit, transported symbol, and verified witness carries nonzero curvature cost?

The paper argues that the classical P vs NP formulation is not the correct physical question. The classical formulation assumes an idealized computational substrate with:

• infinite precision• zero curvature cost• zero geometric memory cost• zero free-energy cost for symbolic distinction• perfect distinguishability• unbounded abstraction from the physical carrier

WCC replaces that abstraction with a curvature-bounded computation model.

Core Structure

The paper defines physical computation through:

• finite-precision wave states• local update rules• bounded propagation• curvature-capacity limits• entropy and stability rails• distinguishability costs for stored and verified symbols

Within this model, computation is not just symbol manipulation. It is geometric state evolution under physical resource constraints.

The paper introduces a curvature-complexity functional:

C_Θ(f)

where Θ is the WCT curvature operator. This functional measures the geometric cost of representing or verifying structured symbolic information inside a curvature-regulated substrate.

Locked-Expander SAT

A central construction is the Locked-Expander 3-SAT family. These instances are designed so that valid witnesses require globally coordinated structure. In the WCC model, the paper argues that realizing these witnesses requires exponential curvature cost:

C_Θ(F_n) ≥ 2^Ω(n)

while physically admissible WCC computation is bounded by polynomial curvature capacity under locality, finite bandwidth, finite precision, and stability constraints.

This yields an internal WCC separation:

P_WCC ≠ NP_WCC

inside the curvature-bounded physical model.

Physical Computation vs Classical Abstraction

Classical Turing computation asks what can be decided by an ideal symbolic machine.

Physical WCC computation asks what can be realized by a bounded geometric system.

The paper’s central conclusion is that the classical P vs NP question is not directly a question about real physical computation. It is a question about a curvature-free, infinite-precision abstraction.

The physical version studied here is:

P_physical ≠ NP_physical

where physical computation is constrained by curvature cost, finite distinguishability, bounded propagation, and finite information capacity.

Key Contributions

• Reframes P vs NP as a physical-computation problem rather than a purely symbolic abstraction.• Defines Wave Curvature Computation (WCC) as a curvature-bounded computational model.• Introduces curvature-capacity constraints for memory, witness representation, transport, and verification.• Develops a Locked-Expander SAT family requiring exponential curvature cost in the WCC model.• Derives an internal physical separation between curvature-bounded polynomial computation and curvature-expensive witness verification.• Identifies the curvature-free Turing machine as an idealized limit rather than a physically complete model of computation.• Connects computational complexity to WCT curvature laws, spectral rails, finite-bandwidth constraints, and geometric information storage.

Why This Matters

If computation is physical, then complexity is not only about time steps and symbolic rules. It is also about the geometry required to store, distinguish, move, and verify information.

This paper proposes that the real-world version of P vs NP must include physical resource costs that classical Turing machines abstract away. Under curvature-bounded computation, NP-style witness search can exceed polynomial physical capacity even when symbolic descriptions remain finite.

The result is a physics-rooted complexity framework in which computational difficulty emerges from geometric curvature cost.

Relation to Previous WCT Volumes

This manuscript builds on:

• P vs NP in Curvature-Bounded Wave Computation — Richard J. Reyes, Zenodo 2025• WaveLock: A Curvature-Locked One-Way Function Based on Nonlinear PDE Evolution — Richard J. Reyes, Zenodo 2025• The Geometry of Resonance — Richard J. Reyes, Zenodo 2025

Together, these works define the WCT/WCC computational program: computation as bounded wave evolution, symbolic structure as geometric confinement, and complexity as curvature cost.

## Research notes

### Main claim


### Evidence and method


### Open questions


### Connections

