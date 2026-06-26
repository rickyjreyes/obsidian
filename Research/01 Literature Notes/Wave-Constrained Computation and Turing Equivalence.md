---
type: literature-note
title: "Discrete Wave-Constrained Computation and Classical Complexity: Turing Equivalence for 𝐏 and 𝐍𝐏"
aliases:
  - "Discrete Wave-Constrained Computation and Classical Complexity: Turing Equivalence for 𝐏 and 𝐍𝐏"
citekey: "reyesDiscreteWaveConstrainedComputation2025"
authors: "Richard J. Reyes"
date: "2025-11-26"
year: "2025"
item_type: "preprint"
publisher: "Zenodo"
doi: "10.5281/zenodo.17732642"
zenodo_record: "https://zenodo.org/records/17732642"
pdf_url: "https://zenodo.org/records/17732642/files/pvnp_turing.pdf"
categories:
  - "Computation & Cryptography"
tags:
  - "literature-note"
  - "collection/computation-&-cryptography"
---

# Discrete Wave-Constrained Computation and Classical Complexity: Turing Equivalence for 𝐏 and 𝐍𝐏

> [!info] Preprint
> **Author:** Richard J. Reyes  
> **Date:** 2025-11-26  
> **Citation key:** `reyesDiscreteWaveConstrainedComputation2025`  
> **DOI:** [10.5281/zenodo.17732642](https://doi.org/10.5281/zenodo.17732642)  
> **Record:** [Open Zenodo record](https://zenodo.org/records/17732642)  
> **PDF:** [Open full-text PDF](https://zenodo.org/records/17732642/files/pvnp_turing.pdf)

## External links

- [GitHub repository](https://github.com/rickyjreyes/Wavelock)

## Overview

This paper isolates the discrete core of Wave Confinement Theory (WCT) as a rigorously defined machine model—wave-constrained computation (WCC)—and compares its complexity classes to the classical Turing framework. In the WCC model, information is stored on a finite lattice Λₙ ⊂ ℤᵈ with finitely many metastable states S and a fixed-radius local update rule U : Sᴺʳ → S. Computation proceeds in synchronous, deterministic rounds subject to three “rails”:(1) Locality (bounded neighborhood radius),(2) Finite precision (fixed |S|), and(3) Bounded propagation (polynomially bounded lattice size |Λₙ|).Under these constraints, the global configuration space S^Λₙ is finite, forbidding hypercomputation…

## Concepts

- [[02 Concepts/AGI Safety|AGI Safety]]
- [[02 Concepts/Cellular Automata|Cellular Automata]]
- [[02 Concepts/Computational Complexity|Computational Complexity]]
- [[02 Concepts/Curvature-Bounded Computation|Curvature-Bounded Computation]]
- [[02 Concepts/Local-Update Machines|Local-Update Machines]]
- [[02 Concepts/NP_WCC|NP_WCC]]
- [[02 Concepts/P vs NP|P vs NP]]
- [[02 Concepts/P_WCC|P_WCC]]
- [[02 Concepts/Turing Equivalence|Turing Equivalence]]
- [[02 Concepts/Turing Machines|Turing Machines]]
- [[02 Concepts/Verifier Bijection|Verifier Bijection]]
- [[02 Concepts/Wave Confinement Theory|Wave Confinement Theory]]
- [[02 Concepts/Wave-Constrained Computation|Wave-Constrained Computation]]

## Related papers

- [[01 Literature Notes/Model-Relative P_WCC vs NP_WCC|Model-Relative P_WCC vs NP_WCC]]
- [[01 Literature Notes/Classical P vs NP Is Ill-Posed|Classical P vs NP Is Ill-Posed]]
- [[01 Literature Notes/WaveLock One-Way Function|WaveLock One-Way Function]]
- [[01 Literature Notes/Physical Constants through Wave Confinement|Physical Constants through Wave Confinement]]
- [[01 Literature Notes/The Geometry of Resonance|The Geometry of Resonance]]

## Abstract / record description

This paper isolates the discrete core of Wave Confinement Theory (WCT) as a rigorously defined machine model—wave-constrained computation (WCC)—and compares its complexity classes to the classical Turing framework. In the WCC model, information is stored on a finite lattice Λₙ ⊂ ℤᵈ with finitely many metastable states S and a fixed-radius local update rule U : Sᴺʳ → S. Computation proceeds in synchronous, deterministic rounds subject to three “rails”:(1) Locality (bounded neighborhood radius),(2) Finite precision (fixed |S|), and(3) Bounded propagation (polynomially bounded lattice size |Λₙ|).Under these constraints, the global configuration space S^Λₙ is finite, forbidding hypercomputation and placing WCC firmly inside classical discrete complexity.

Within this resource model, the paper constructs an explicit simulation of any polynomial-time deterministic Turing machine by a polynomial-time WCC machine. The encoding maps tape configurations to lattice configurations with only constant-factor overhead in time and polynomial overhead in space, and the local rule U is shown to realize single-tape head moves using radius-1 neighborhoods. Conversely, any polynomial-time WCC machine is simulated by a deterministic Turing machine with polynomial overhead via a standard “cellular automaton on a tape” construction, together yielding the class equality 𝐏𝗪𝗖𝗖 = 𝐏𝗧𝘂𝗿𝗶𝗻𝗴.A deterministic replay lemma guarantees that, given (C₀, U), the entire trajectory (Cₜ)ₜ ≥ ₀ is uniquely determined and reproducible by any verifier, making WCC evolutions fully auditable.

The equivalence is then lifted from deterministic decision procedures to verifier-based nondeterministic computation. The paper defines 𝐍𝐏𝗪𝗖𝗖 via polynomial-time WCC verifiers with polynomially bounded witnesses, constructs an explicit certificate-embedding map from classical witnesses w into WCC configurations, and proves a verifier bijection L ∈ 𝐍𝐏 ⇔ L ∈ 𝐍𝐏𝗪𝗖𝗖. Together with the 𝐏-equivalence, this establishes a full bijection between (𝐏, 𝐍𝐏) and (𝐏𝗪𝗖𝗖, 𝐍𝐏𝗪𝗖𝗖) at the discrete symbolic level. As a consequence, wave-constrained computation—once stripped down to locality, finite precision, and bounded propagation—realizes exactly the classical 𝐏 and 𝐍𝐏 classes: it is neither sub-Turing nor super-Turing in power.

Finally, the manuscript interprets these equivalence results in the broader WCT/AGI context. It shows how the discrete WCC–Turing bijection serves as a symbolic backbone for later work where geometric and energetic WCT rails (curvature-bounded bandlimits, dimensional locks, and spatiotemporal resource ceilings) are added on top. Under these additional physical constraints, and assuming the classical separation 𝐏 ≠ 𝐍𝐏, the framework yields a conditional NP-safety statement: no AGI implemented on WCT-bounded hardware with polynomial volume, time, and energy can decide all NP-complete languages on all inputs within polynomial physical resources. Any such violation would have to break either the WCT rails or the standard complexity assumption, not the discrete equivalence established here.

Key Contributions

• Formal definition of discrete WCC machines as finite-lattice, finite-state, finite-radius local-update models with explicit space, time, and precision rails.• Deterministic replay and precision-stability lemmas showing that global WCC evolution is uniquely determined, auditable, and confined to fixed finite precision.• Polynomial-time simulation of deterministic Turing machines by WCC machines with constant-factor time overhead and polynomial space overhead, yielding 𝐏𝗧𝘂𝗿𝗶𝗻𝗴 ⊆ 𝐏𝗪𝗖𝗖.• Polynomial-time simulation of WCC machines by deterministic Turing machines with polynomial overhead, yielding 𝐏𝗪𝗖𝗖 ⊆ 𝐏𝗧𝘂𝗿𝗶𝗻𝗴 and thus 𝐏𝗪𝗖𝗖 = 𝐏𝗧𝘂𝗿𝗶𝗻𝗴.• Definition of 𝐍𝐏𝗪𝗖𝗖 via WCC verifiers and an explicit certificate-embedding map, together with a verifier bijection proving 𝐍𝐏𝗪𝗖𝗖 = 𝐍𝐏𝗧𝘂𝗿𝗶𝗻𝗴.• A four-layer bijection construction (input encoding, acceptance decoding, certificate embedding, dynamical correspondence) that establishes a one-to-one correspondence between classical (x, w) pairs and wave-encoded (E(x), C(w)) configurations.• Interpretation of the discrete equivalence as a foundation for WCT-based curvature and resource-bounded lower bounds, including a conditional NP-safety result for WCT-bounded AGI systems.

Relation to Previous WCT Volumes

This paper extracts and completes the purely discrete, classical part of the broader Wave Confinement Theory computational program developed in:

• Structure and Derivation of Physical Constants through Wave Confinement Richard J. Reyes, Zenodo 2025, DOI: 10.5281/zenodo.15341540

• The Geometry of Resonance: Wave Confinement Theory and the Emergence of Mass, Force, and Spacetime Richard J. Reyes, Zenodo 2025, DOI: 10.5281/zenodo.15356814

It also refines and extends the discrete Turing-abstraction and complexity-class mapping first formulated in:

• P vs NP in Curvature-Bounded Wave Computation — A Model-Relative 𝐏𝗪𝗖𝗖 ≠ 𝐍𝐏𝗪𝗖𝗖 Separation Richard J. Reyes, Zenodo 2025

These earlier works introduce the continuous curvature operators, curvature-entropy functionals, and WCT rails that motivate WCC. The present paper isolates the discrete WCC model, proves its exact Turing equivalence, and prepares the ground for transferring curvature-based lower bounds into the classical complexity landscape under explicit compatibility hypotheses.

## Research notes

### Main claim


### Evidence and method


### Open questions


### Connections

