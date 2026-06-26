---
id: "C1"
type: "closure-equation"
title: "Master Action Principle"
family: "Canonical Closure Layer"
status: "canonical"
source: "EQUATIONS.md"
aliases:
  - "Master Action Principle"
  - "C1 Master Action Principle"
tags:
  - "wct/equation"
  - "wct/closure"
---

# C1 — Master Action Principle

> [!info] Classification
> **Family:** Canonical Closure Layer  
> **Status:** canonical  
> **Canonical source:** `EQUATIONS.md`

## Canonical statement

The dynamics of the wavefield are defined by the curvature-regularized WCT action:

$$
S[\psi] = \int L_{\text{WCT}}(\psi,\partial\psi,\Theta[\psi])\, d^4x
$$

with Lagrangian density

$$
L_{\text{WCT}}
=
|\partial_\mu \psi|^2
-
V(|\psi|^2)
+
\kappa
\left(
\frac{\Box \psi}{g(\psi)}
\right)^2
+
\theta \, \Theta[\psi]^2
+
\gamma
\left(
\frac{\Box \psi}{g(\psi)}
\right)
\Theta[\psi]
$$

where

$$
g(\psi) = \psi + \epsilon e^{-\alpha |\psi|^2}
$$

and

$$
\Theta[\psi] =
-\frac{\nabla^2\psi}{\psi + \epsilon e^{-\alpha|\psi|^2}}
$$

This action generates the field equations governing curvature-confined wave dynamics.

---

## Governing or related master equations

- [[03 Equations/01 Master and Closure Equations/Master Equations/ME2 - Curvature Operator & Lyapunov Energy|ME2 - Curvature Operator & Lyapunov Energy]]
- [[03 Equations/01 Master and Closure Equations/Master Equations/ME6B - Nonlinear Curvature Operator (N_curv)|ME6B - Nonlinear Curvature Operator ($\mathcal{N}_{\text{curv}}$)]]
- [[03 Equations/01 Master and Closure Equations/Master Equations/ME7 - Full Curvature-Wavefield Master Equation (UWCT)|ME7 - Full Curvature–Wavefield Master Equation (UWCT)]]

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
- Next: [[03 Equations/01 Master and Closure Equations/Closure Layer/C2 - Noether Current Conservation|C2 - Noether Current Conservation]]
