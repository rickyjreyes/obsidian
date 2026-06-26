---
id: "EX"
type: "equation"
title: "Logarithmic Field Representation"
family: "Logarithmic Curvature Flow"
status: "canonical"
source: "EQUATIONS.md"
aliases:
  - "Logarithmic Field Representation"
  - "EX Logarithmic Field Representation"
tags:
  - "wct/equation"
  - "wct/log-curvature-flow"
---

# EX — Logarithmic Field Representation

> [!info] Classification
> **Family:** Logarithmic Curvature Flow  
> **Status:** canonical  
> **Canonical source:** `EQUATIONS.md`

## Canonical statement

### Plain definition

Introduce a logarithmic representation of the wavefield to expose the geometric structure of the curvature operator.

### Symbolic form

Logarithmic transform

u = ln ψ

Inverse relation

ψ = e^u

Gradient relation

∇ψ = e^u ∇u

Laplacian relation

∇²ψ = e^u ( ∇²u + |∇u|² )

Curvature ratio identity

(∇²ψ) / ψ = ∇²u + |∇u|²

### Context

This identity converts the curvature operator

Θ[ψ] = − ∇²ψ / ψ

into the nonlinear geometric form

Θ[ψ] = − ( ∇²u + |∇u|² )

revealing a Hamilton–Jacobi curvature flow.

---

## Governing or related master equations

- [[03 Equations/01 Master and Closure Equations/Master Equations/ME2 - Curvature Operator & Lyapunov Energy|ME2 - Curvature Operator & Lyapunov Energy]]
- [[03 Equations/02 Canonical Families/C - Curvature Feedback and Lyapunov Dynamics/E17 - Curvature operator|E17 - Curvature operator]]

## Related papers

- [[Logarithmic Curvature Flow, Filament Localization, and the Geometric Origin of the Lepton Mass Spectrum]]

## Related concepts

- [[02 Concepts/Logarithmic Curvature Operator|Logarithmic Curvature Operator]]
- [[02 Concepts/Cole-Hopf Transform|Cole-Hopf Transform]]
- [[02 Concepts/Filament Localization|Filament Localization]]
- [[02 Concepts/KPZ Equation|KPZ Equation]]

## Navigation

- [[03 Equations/00 Equations Index|Equations Index]]
- Next: [[03 Equations/05 Logarithmic Curvature Flow/EY - Log-Curvature Evolution Equation|EY - Log–Curvature Evolution Equation]]
