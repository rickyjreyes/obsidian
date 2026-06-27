---
id: ART-WCT-REPOSITORY-REGISTRY
type: artifact
title: WCT Repository Registry
created: 2026-06-27
repositories:
  - geometry_of_resonance
  - wct-sympy
  - wct-lean
---

# WCT Repository Registry

This note aligns the Obsidian research layer with the maintained public repositories.

## Repository roles

### geometry_of_resonance

Canonical source for master equations, the corrected full equation list, paper ordering, and research implementations.

- Repository: https://github.com/rickyjreyes/geometry_of_resonance
- Canonical equation source: `WCT_FULL_EQUATION_LIST_CORRECTED.md`
- Master equation source: `WCT_MASTER_EQUATIONS_UPDATED.md`

### wct-sympy

Executable symbolic audit for identities, dimensions, limits, residuals, and counterexamples.

- Repository: https://github.com/rickyjreyes/wct-sympy
- Canonical family summary: `EQUATIONS.md`
- Full registry: `equations/full_registry.yaml`

### wct-lean

Kernel-checked definitions, lemmas, counterexamples, and conditional theorems.

- Repository: https://github.com/rickyjreyes/wct-lean
- Maintained compiled root: `WCTLean/Main.lean`

## Canonical definitions

### Curvature feedback

$$
R_\varepsilon(\psi)
=
\frac{\overline\psi}{|\psi|^2+\varepsilon^2e^{-2\alpha|\psi|^2}},
$$

$$
\Theta_\varepsilon[\psi]
=
-(\Delta\psi)R_\varepsilon(\psi).
$$

The denominator is strictly positive for $\varepsilon>0$.

### Finite-band selection

$$
\sigma(k)=r+a k^2-b k^4,
\qquad
k_\star=\sqrt{\frac{a}{2b}}.
$$

### Rest energy and loop locking

$$
\sigma_{\mathrm{dens}}=\kappa^2+\tau^2,
\qquad
\sigma=\sqrt{\kappa^2+\tau^2},
\qquad
m=\frac{\hbar}{c}\langle\sigma\rangle_w.
$$

### Dimensional regularity

$$
\psi\in H^2,
\quad |D_\varepsilon(\psi)|\ge\delta
\Longrightarrow
\|\Theta_\varepsilon[\psi]\|_{L^2}
\le
\delta^{-1}\|\Delta\psi\|_{L^2}.
$$

$$
\psi\in H^s,
\quad s>\frac n2+2
\Longrightarrow
\Theta_\varepsilon[\psi]\in L^\infty.
$$

The exact embedding threshold $H^2\hookrightarrow L^\infty$ gives integer $n\le3$. Nonlinear subcriticality is a separate hypothesis.

### Cavity and effective mass

$$
Q_{\mathrm{eff}}=\frac{\omega U}{P_{\mathrm{loss}}},
$$

$$
\frac{dW}{dt}
=P_{\mathrm{in}}+P_{\mathrm{fusion}}-P_{\mathrm{loss}}-P_{\mathrm{out}},
$$

$$
\omega_j^2=c^2\lambda_j+\Delta_\star
\Longrightarrow
m_{\mathrm{eff}}^2=\frac{\hbar^2\Delta_\star}{c^4}.
$$

### Spectral projection and coherence length

$$
\lambda_\star
=\frac{2\pi}{k_\star}
=2\pi\sqrt{\frac{2b}{a}},
$$

$$
\xi_{\mathrm{coh}}
=\left(\sum_k p_k|k|^2\right)^{-1/2}
=\sqrt{\frac{\int|\psi|^2\,dx}{\int|\nabla\psi|^2\,dx}}.
$$

## Lean formal mappings

| Equation | Formal declaration or status |
|---|---|
| E2 | `densityWeightedAverage_denominator_ne_zero` |
| E3 | `lockingMismatch_nonnegative`, `lockingMismatch_zero` |
| E5 | `effectiveWavenumber_eq_loopAverage`, `constantWeightedAverage_eq_loopAverage`, `resolved_e5_effectiveWavenumber_chain` |
| E9 | `polarCurrentProduct_im`, `phaseCurrent_of_polar_factorization`, `conservationResidual_zero_iff` |
| E13/E14 | `bandpass_oneMode_symbol` |
| E18 | `resolved_e18_energy_nonnegative`, `resolved_e18_gradientFlow_descent` |
| E58 | `bandGreenDenominator_pos`, `bandGreenKernel_pos`, `bandGreenKernel_le_inverseOffset`, `bandGreenKernel_at_shell` |
| CM9 | `photonSecondOrder_iff_firstOrder`, `baryonSecondOrder_iff_firstOrder` |
| CM12/CM13/CM16 | formal definitions for power spectra, peak ratios, and horizon wavenumber |

## Vault integration

The WCT Graph Engine **Repositories** tab uses these canonical families to match concepts and equation notes to:

- their canonical equation family;
- the SymPy audit role;
- available Lean declarations;
- the geometry-of-resonance source repository.

The **Definition**, **Equations**, **Papers**, **Links**, **Backlinks**, **Properties**, **Repositories**, **All**, and **Source** tabs provide isolated views of one research object while preserving access to its full context.
