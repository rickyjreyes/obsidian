---
type: "equation-reference"
tags:
  - "wct/equation-index"
  - "wct/corrections"
---

# Canonical Corrections and Alignment

This section records notation, closure, and consistency corrections applied to the preceding analysis. No new physical assumptions are introduced. All changes align the presentation with the canonical Wave Confinement Theory (WCT) equation set (E17–E18, E30, E34, E43).

---

### 1. Lyapunov Energy Functional

Earlier drafts referenced the curvature penalty

$$E_\Theta = \int |\Theta[\psi]|^2\,dx$$

as a stability proxy. This has been corrected to the full WCT Lyapunov candidate

$$\mathcal{E}_{\text{WCT}}[\psi] = \int \left( |\nabla\psi|^2 + |\Theta[\psi]|^2 \right) dx,$$

consistent with the canonical formulation (E18). The quantity $E_\Theta$ is retained only as the curvature component within $\mathcal{E}_{\text{WCT}}$.

---

### 2. Spectral Curvature Closure

In the spectral analysis, the denominator of $\Theta[\psi]$ was approximated by a constant amplitude scale. This approximation is now made explicit via the effective closure

$$D_{\text{eff}}^2 := \langle |\psi|^2 \rangle + \varepsilon^2,$$

leading to the curvature cost

$$C_\Theta(k) = \frac{k^4}{D_{\text{eff}}^2}.$$

This clarifies that the $k^4$ spectral penalty arises from a mean–amplitude (weak–intermittency) closure rather than an exact identity.

---

### 3. Symbol Disambiguation in the Spectral Functional

To avoid collision with the nonlinear saturation parameter $\alpha$ appearing in the definition of $\Theta[\psi]$, the spectral free-energy weights have been relabeled:

$$\alpha \to \lambda_\Theta, \qquad \beta \to \lambda_{\text{ex}}.$$

No change in functional form or interpretation is implied.

---

### 4. Macro–Micro Control Parameter

The regime parameter governing entropy-dominated versus curvature-dominated behavior is redefined in observable terms as

$$\Xi = \frac{\int k^4 \rho(k)\, dk}{H}, \qquad H = -\sum_k P_k \log P_k,$$

eliminating reliance on an undefined "noise temperature" and aligning the definition with the spectral entropy (E30).

---

### 5. Entropy–Curvature Relation

The empirical entropy–curvature coupling is stated in its canonically bounded form

$$\frac{dH}{dt} \leq -\mu\, |\Theta[\psi]|^2,$$

consistent with the curvature–entropy tradeoff (E43) and its integrated variant (E34).

---

### 6. Isoelectronic Flow Consistency

The imaginary-time isoelectronic evolution equation is explicitly identified as a radially reduced, imaginary-time sector of the unified curvature–wavefield equation (UWCT), with ultraviolet smoothing and norm enforcement included for numerical well-posedness. No additional dynamical primitives are introduced.

---

### 7. Scope of Corrections

All corrections in this section are:

- notational or definitional clarifications,
- explicit statements of previously implicit closures,
- alignments with the canonical WCT master equations.

They do not alter the qualitative or quantitative conclusions of the empirical results, but ensure internal consistency, symbol hygiene, and direct traceability to the WCT core equation architecture.





---

## Source-family discrepancy

- `MASTER_EQUATIONS.md` names CL1–CL12, but the supplied catalogue does not define them.
- The defined curvature-locking family is CLE1–CLE10.
- See [[03 Equations/08 Source Gaps/CL1-CL12 Source Status|CL1–CL12 Source Status]].
