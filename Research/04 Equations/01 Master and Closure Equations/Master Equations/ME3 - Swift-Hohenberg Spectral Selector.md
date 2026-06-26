---
id: "ME3"
type: "master-equation"
title: "Swift–Hohenberg Spectral Selector"
family: "Master Equation Architecture"
status: "canonical"
source: "MASTER_EQUATIONS.md"
aliases:
  - "Swift–Hohenberg Spectral Selector"
  - "ME3 Swift–Hohenberg Spectral Selector"
tags:
  - "wct/equation"
  - "wct/master-equation"
---

# ME3 — Swift–Hohenberg Spectral Selector

> [!info] Classification
> **Family:** Master Equation Architecture  
> **Status:** canonical  
> **Canonical source:** `MASTER_EQUATIONS.md`

## Canonical statement

*Generates: cymatics, band-limited growth, spectral pruning, vortex lattices, ghost-mode modeling.*

Amplitude $A(x,t)$ of a pattern-forming field obeys a band-selective evolution equation:

$$\partial_t A = \mu A - g|A|^2 A + b(\Delta + k_*^2)^2 A$$

- The $(\Delta + k_*^2)^2$ term suppresses modes away from $|k| = k_*$, selecting a **dominant spectral shell**.

- Nonlinear saturation yields **self-organized patterns**, **Fourier cymatics**, and **ring / lattice structures**.

- In log-energy coordinates, this spectral-selection template motivates the **ghost-mode modulation ansatz** used in JUNO phenomenology.

**Downstream families:** E12–E16, E57–E64, E73–E78.

---

## Governing or related master equations

- [[03 Equations/02 Canonical Families/B - Phase-Flux Field and Cymatic Rails/E12 - Finite-band dispersion rail|E12 - Finite-band dispersion rail]]
- [[03 Equations/02 Canonical Families/B - Phase-Flux Field and Cymatic Rails/E13 - Band-pass amplitude evolution|E13 - Band-pass amplitude evolution]]
- [[03 Equations/02 Canonical Families/I - Self-Emergent Fourier Cymatics/E57 - Swift-Hohenberg operator representation|E57 - Swift–Hohenberg operator representation]]

## Related papers

- [[The Geometry of Resonance]]
- [[Phase-Flux Field]]
- [[Self-Emergent Fourier Cymatics]]
- [[Hard Upper Bound on Spatial Dimensionality in Wave Confinement Theory]]

## Related concepts

- [[02 Concepts/Wave Confinement Theory|Wave Confinement Theory]]
- [[02 Concepts/Curvature Feedback|Curvature Feedback]]
- [[02 Concepts/Unified Field Theory|Unified Field Theory]]

## Navigation

- [[03 Equations/00 Equations Index|Equations Index]]
- Previous: [[03 Equations/01 Master and Closure Equations/Master Equations/ME2 - Curvature Operator & Lyapunov Energy|ME2 - Curvature Operator & Lyapunov Energy]]
- Next: [[03 Equations/01 Master and Closure Equations/Master Equations/ME4 - Dimensional Stability Inequality|ME4 - Dimensional Stability Inequality]]
