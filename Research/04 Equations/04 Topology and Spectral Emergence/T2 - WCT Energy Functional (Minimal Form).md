---
id: "T2"
type: "equation-module"
title: "WCT Energy Functional (Minimal Form)"
family: "Topology and Spectral Emergence"
status: "module"
source: "EQUATIONS.md"
aliases:
  - "WCT Energy Functional (Minimal Form)"
  - "T2 WCT Energy Functional (Minimal Form)"
tags:
  - "wct/equation"
  - "wct/topology"
---

# T2 — WCT Energy Functional (Minimal Form)

> [!info] Classification
> **Family:** Topology and Spectral Emergence  
> **Status:** module  
> **Canonical source:** `EQUATIONS.md`

## Canonical statement

\[
\boxed{
\mathcal{E}_{\text{WCT}}[\gamma]
=
\int \kappa^2 \, ds
+
\alpha \sum_k k^p \left( |a_k|^2 + |b_k|^2 \right)
+
V_{\text{SA}}[\gamma]
}
\]

**Terms**:
- \( \int \kappa^2 ds \): curvature confinement
- spectral penalty: ultraviolet suppression
- \( V_{\text{SA}} \): self-avoidance (steric exclusion)

**Uniqueness**:
- No gauge fields
- No imposed topology
- No quantization postulates

This functional is implemented directly in WCT CuPy simulations.

**Observed Constraint**  
> Stability requires \( p > 1 \).  
> For \( p \le 1 \), ultraviolet cascade destroys all confined structures under curvature flow.

Thus, spectral suppression is not optional—it is a **necessity condition** for persistence.

---

## Governing or related master equations

- [[03 Equations/01 Master and Closure Equations/Master Equations/ME1 - Curvature Locking Functional|ME1 - Curvature Locking Functional]]
- [[03 Equations/01 Master and Closure Equations/Master Equations/ME2 - Curvature Operator & Lyapunov Energy|ME2 - Curvature Operator & Lyapunov Energy]]
- [[03 Equations/01 Master and Closure Equations/Master Equations/ME3 - Swift-Hohenberg Spectral Selector|ME3 - Swift–Hohenberg Spectral Selector]]

## Related papers

- [[Curvature-Locked psi-Field Solitons]]
- [[Emergence of Effective Mass - Solenoidal Topology of Vibrational Energy]]

## Related concepts

- [[02 Concepts/Topological Confinement|Topological Confinement]]
- [[02 Concepts/Curvature Flow|Curvature Flow]]
- [[02 Concepts/Spectral structure|Spectral structure]]
- [[02 Concepts/Geometric Mass Models|Geometric Mass Models]]

## Navigation

- [[03 Equations/00 Equations Index|Equations Index]]
- Previous: [[03 Equations/04 Topology and Spectral Emergence/T1 - Configuration Space (WCT Postulate)|T1 - Configuration Space (WCT Postulate)]]
- Next: [[03 Equations/04 Topology and Spectral Emergence/T3 - Irreversible Curvature Flow (Core WCT Principle)|T3 - Irreversible Curvature Flow (Core WCT Principle)]]
