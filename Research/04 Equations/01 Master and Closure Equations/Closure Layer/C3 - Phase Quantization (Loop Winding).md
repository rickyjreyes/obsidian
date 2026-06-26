---
id: "C3"
type: "closure-equation"
title: "Phase Quantization (Loop Winding)"
family: "Canonical Closure Layer"
status: "canonical"
source: "EQUATIONS.md"
aliases:
  - "Phase Quantization (Loop Winding)"
  - "C3 Phase Quantization (Loop Winding)"
tags:
  - "wct/equation"
  - "wct/closure"
---

# C3 — Phase Quantization (Loop Winding)

> [!info] Classification
> **Family:** Canonical Closure Layer  
> **Status:** canonical  
> **Canonical source:** `EQUATIONS.md`

## Canonical statement

Closed phase loops satisfy the quantization condition

$$
\oint_\Gamma \nabla \theta \cdot d\ell = 2\pi n,
\quad n \in \mathbb{Z}.
$$

Equivalently,

$$
n = \frac{1}{2\pi} \oint \nabla \arg(\psi)\cdot d\ell.
$$

This quantization condition defines:

- topological winding
- particle identity
- curvature-locked eigenmodes.

It leads directly to the effective wavenumber relation

$$
k_{\text{eff}} = \frac{2\pi |n|}{L_s}.
$$

---

## Governing or related master equations

- [[03 Equations/01 Master and Closure Equations/Master Equations/ME1 - Curvature Locking Functional|ME1 - Curvature Locking Functional]]

## Related papers

- [[The Geometry of Resonance]]
- [[Formal Derivation of Wave Confinement Theory from the Standard Model Lagrangian]]
- [[WCT Closure Complete]]

## Related concepts

- [[02 Concepts/Wave Confinement Theory|Wave Confinement Theory]]
- [[02 Concepts/Curvature Feedback|Curvature Feedback]]
- [[02 Concepts/Phase winding|Phase winding]]
- [[02 Concepts/Renormalization|Renormalization]]

## Navigation

- [[03 Equations/00 Equations Index|Equations Index]]
- Previous: [[03 Equations/01 Master and Closure Equations/Closure Layer/C2 - Noether Current Conservation|C2 - Noether Current Conservation]]
- Next: [[03 Equations/01 Master and Closure Equations/Closure Layer/C4 - Dispersion Relation|C4 - Dispersion Relation]]
