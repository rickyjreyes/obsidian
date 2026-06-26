---
id: "C5"
type: "closure-equation"
title: "Renormalization / Scale Flow"
family: "Canonical Closure Layer"
status: "canonical"
source: "EQUATIONS.md"
aliases:
  - "Renormalization / Scale Flow"
  - "C5 Renormalization / Scale Flow"
tags:
  - "wct/equation"
  - "wct/closure"
---

# C5 — Renormalization / Scale Flow

> [!info] Classification
> **Family:** Canonical Closure Layer  
> **Status:** canonical  
> **Canonical source:** `EQUATIONS.md`

## Canonical statement

### Plain definition

The effective confinement curvature of WCT changes with observation scale.  
Renormalization is therefore defined first as geometric scale flow, and second as induced coupling flow.

### Symbolic form

Define the scale-dependent effective curvature

$$
\Sigma(\mu) := \langle \sigma \rangle_\mu.
$$

Its beta function is

$$
\beta_{\Sigma} := \mu \frac{d\Sigma}{d\mu}.
$$

Equivalently,

$$
\frac{d\Sigma}{d\ln \mu}
=
\beta_{\Sigma}(\Sigma;\kappa,\alpha,\theta,\gamma,\dots).
$$

Since

$$
m(\mu)=\frac{\hbar}{c}\Sigma(\mu),
$$

mass runs as

$$
\mu \frac{dm}{d\mu}
=
\frac{\hbar}{c}\beta_{\Sigma}.
$$

The action couplings also run:

$$
\beta_i := \mu \frac{d g_i}{d\mu},
\qquad
g_i \in \{\kappa,\alpha,\theta,\gamma,\dots\}.
$$

A scale-stable confinement sector satisfies

$$
\beta_{\Sigma}=0,
\qquad
\beta_i=0.
$$

### Context

This equation defines the renormalization structure of WCT:  
the confinement spectrum itself runs with scale, and the action couplings follow as effective parameters.

## Governing or related master equations

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
- Previous: [[03 Equations/01 Master and Closure Equations/Closure Layer/C4 - Dispersion Relation|C4 - Dispersion Relation]]
