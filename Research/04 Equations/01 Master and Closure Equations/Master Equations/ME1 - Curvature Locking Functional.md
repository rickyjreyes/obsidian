---
id: "ME1"
type: "master-equation"
title: "Curvature Locking Functional"
family: "Master Equation Architecture"
status: "canonical"
source: "MASTER_EQUATIONS.md"
aliases:
  - "Curvature Locking Functional"
  - "ME1 Curvature Locking Functional"
tags:
  - "wct/equation"
  - "wct/master-equation"
---

# ME1 — Curvature Locking Functional

> [!info] Classification
> **Family:** Master Equation Architecture  
> **Status:** canonical  
> **Canonical source:** `MASTER_EQUATIONS.md`

## Canonical statement

*Generates: mass law, loop locking, ψ-electron constraints, Compton radius.*

Local curvature $\sigma(s)$ of a closed loop $\Gamma$ determines the allowed global phase profile $\varphi(s)$:

$$S_{\text{lock}}[\varphi] = \int_\Gamma w(s) \left( \partial_s \varphi(s) - \sigma(s) \right)^2 ds$$

where

$$\sigma(s) = \sqrt{\kappa(s)^2 + \tau(s)^2}$$

- Variation of $S_{\text{lock}}$ yields the **loop-locking Euler–Lagrange equation** and, with the identification $E_{\text{rest}} = \hbar c\, k_{\text{eff}}$, the **mass–curvature law**:

$$m = \frac{\hbar}{c} \langle\sigma\rangle_w$$

- In toroidal 3D geometries, analogous curvature-locking conditions reduce to the **ψ-electron eigenproblem**, producing the **Compton-scale radius**:

$$R = \frac{1}{\sigma_\star}$$

**Downstream families:** E1–E8, CLE1–CLE3, CLE4–CLE10, CL1–CL10.

---

## Governing or related master equations

- [[03 Equations/01 Master and Closure Equations/Closure Layer/C3 - Phase Quantization (Loop Winding)|C3 - Phase Quantization (Loop Winding)]]
- [[03 Equations/01 Master and Closure Equations/Closure Layer/C4 - Dispersion Relation|C4 - Dispersion Relation]]

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
- Next: [[03 Equations/01 Master and Closure Equations/Master Equations/ME2 - Curvature Operator & Lyapunov Energy|ME2 - Curvature Operator & Lyapunov Energy]]
