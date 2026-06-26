---
id: "ME2"
type: "master-equation"
title: "Curvature Operator & Lyapunov Energy"
family: "Master Equation Architecture"
status: "canonical"
source: "MASTER_EQUATIONS.md"
aliases:
  - "Curvature Operator & Lyapunov Energy"
  - "ME2 Curvature Operator & Lyapunov Energy"
tags:
  - "wct/equation"
  - "wct/master-equation"
---

# ME2 — Curvature Operator & Lyapunov Energy

> [!info] Classification
> **Family:** Master Equation Architecture  
> **Status:** canonical  
> **Canonical source:** `MASTER_EQUATIONS.md`

## Canonical statement

*Generates: Θ-operator, collapse, stability, cavity physics, effective metric proposals.*

Curvature feedback is encoded in a nonlinear operator $\Theta[\psi]$ and an associated energy functional:

$$\Theta[\psi] = -\frac{\nabla^2\psi}{\psi + \varepsilon\, e^{-\alpha|\psi|^2}}$$

$$\mathcal{E}_{\text{WCT}}[\psi] = \int \left( |\nabla\psi|^2 + |\Theta[\psi]|^2 \right) dx$$

- For gradient-flow-type evolutions

$$\partial_t \psi \propto -\frac{\delta \mathcal{E}_{\text{WCT}}}{\delta \psi^*}$$

the functional $\mathcal{E}_{\text{WCT}}$ acts as a **Lyapunov candidate**.

- Stationary points of $\mathcal{E}_{\text{WCT}}$ yield **curvature-locked states**, cavity modes, and the **feedback-collapsed ψ-electron** (CLE4–CLE10).

- Couplings to matter density in the extended formulation motivate an **effective metric** $g_{\mu\nu}^{\text{eff}}$.

**Downstream families:** E17–E23, CLE4–CLE10, CL5–CL6, cavity / stability relations.

---

## Governing or related master equations

- [[03 Equations/01 Master and Closure Equations/Closure Layer/C1 - Master Action Principle|C1 - Master Action Principle]]
- [[03 Equations/01 Master and Closure Equations/Closure Layer/C2 - Noether Current Conservation|C2 - Noether Current Conservation]]

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
- Previous: [[03 Equations/01 Master and Closure Equations/Master Equations/ME1 - Curvature Locking Functional|ME1 - Curvature Locking Functional]]
- Next: [[03 Equations/01 Master and Closure Equations/Master Equations/ME3 - Swift-Hohenberg Spectral Selector|ME3 - Swift–Hohenberg Spectral Selector]]
