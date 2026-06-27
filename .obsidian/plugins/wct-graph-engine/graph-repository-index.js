"use strict";

const REPOSITORIES = {
  geometry: {
    id: "geometry_of_resonance",
    label: "geometry_of_resonance",
    role: "Canonical master equations, equation registry, papers, and executable research source.",
    url: "https://github.com/rickyjreyes/geometry_of_resonance",
  },
  sympy: {
    id: "wct-sympy",
    label: "wct-sympy",
    role: "Executable symbolic audit: identities, dimensions, limits, residuals, and counterexamples.",
    url: "https://github.com/rickyjreyes/wct-sympy",
  },
  lean: {
    id: "wct-lean",
    label: "wct-lean",
    role: "Kernel-checked definitions, lemmas, counterexamples, and conditional theorems.",
    url: "https://github.com/rickyjreyes/wct-lean",
  },
};

const FAMILY_ENTRIES = [
  {
    key: "rest-energy",
    title: "Rest energy and loop locking",
    ids: ["E1A", "E1B", "E2", "E3", "E4", "E5", "E6", "E7", "E8"],
    keywords: ["rest energy", "loop locking", "effective wavenumber", "density weighted", "solenoidal", "curvature density"],
    markdown: String.raw`Canonical symbolic family:

$$
\sigma_{\mathrm{dens}}=\kappa^2+\tau^2,
\qquad
\sigma=\sqrt{\kappa^2+\tau^2},
\qquad
m=\frac{\hbar}{c}\langle\sigma\rangle_w.
$$

Corrected weighted lock identity:

$$
\oint_\Gamma w\,\partial_s\varphi\,ds
=
\oint_\Gamma w\,\sigma\,ds+\alpha L_s.
$$`,
    repositories: ["geometry", "sympy"],
  },
  {
    key: "phase-flux",
    title: "Phase-flux and finite-band selection",
    ids: ["E9", "E10", "E11", "E12", "E13", "E14", "E15", "E16"],
    keywords: ["phase flux", "finite band", "band pass", "shell selection", "spectral extremum", "swift hohenberg", "wavenumber"],
    markdown: String.raw`Canonical finite-band symbol:

$$
\sigma(k)=r+a k^2-b k^4,
\qquad
k_\star=\sqrt{\frac{a}{2b}}.
$$`,
    repositories: ["geometry", "sympy"],
  },
  {
    key: "curvature-feedback",
    title: "Curvature feedback",
    ids: ["E17", "E18", "E19", "E20", "E21", "E22", "E23"],
    keywords: ["curvature feedback", "curvature operator", "theta operator", "regularized reciprocal", "lyapunov", "gradient flow"],
    markdown: String.raw`The symbolic audit uses the nonsingular regularized reciprocal

$$
R_\varepsilon(\psi)
=
\frac{\overline\psi}{|\psi|^2+\varepsilon^2e^{-2\alpha|\psi|^2}},
$$

and the regularized curvature operator

$$
\Theta_\varepsilon[\psi]
=
-(\Delta\psi)R_\varepsilon(\psi).
$$

For $\varepsilon>0$, the denominator is strictly positive.`,
    repositories: ["geometry", "sympy", "lean"],
  },
  {
    key: "dimensional-stability",
    title: "Dimensional stability and regularity",
    ids: ["E24", "E25", "E26", "E27", "E65", "E66", "E67", "E68", "E69", "E70"],
    keywords: ["dimensional stability", "dimensionality", "n ≤ 3", "n<=3", "sobolev", "regularity", "embedding threshold"],
    markdown: String.raw`Two distinct regularity statements are tracked:

$$
\psi\in H^2,
\quad |D_\varepsilon(\psi)|\ge\delta
\Longrightarrow
\|\Theta_\varepsilon[\psi]\|_{L^2}
\le
\delta^{-1}\|\Delta\psi\|_{L^2},
$$

and

$$
\psi\in H^s,
\quad s>\frac n2+2
\Longrightarrow
\Theta_\varepsilon[\psi]\in L^\infty.
$$

The exact embedding threshold $H^2\hookrightarrow L^\infty$ gives integer $n\le3$; nonlinear subcriticality is a separate hypothesis.`,
    repositories: ["geometry", "sympy"],
  },
  {
    key: "entropy",
    title: "Entropy and recursive state evolution",
    ids: ["E28", "E29", "E30", "E31", "E32", "E33", "E34", "E41", "E72"],
    keywords: ["entropy", "alpha drop", "recursive state", "retained fraction", "configuration count", "support size"],
    markdown: String.raw`For retained fractions $\rho_t\in(0,1]$,

$$
\alpha(n)
=
1+\frac1n\sum_t\log_2\rho_t+\beta(n).
$$

For support size $K$,

$$
H\le\log K,
\qquad
e^H\le K.
$$`,
    repositories: ["geometry", "sympy"],
  },
  {
    key: "cavity-mass",
    title: "Cavity, power balance, and effective mass",
    ids: ["E44", "E45", "E46", "E47", "E48", "E49", "E50", "E51", "E52", "E53", "E54", "E55", "E56"],
    keywords: ["cavity", "effective mass", "q factor", "power balance", "plasma cavity", "resonant cavity", "tokamak scaling"],
    markdown: String.raw`Corrected cavity relations include

$$
Q_{\mathrm{eff}}=\frac{\omega U}{P_{\mathrm{loss}}},
$$

$$
\frac{dW}{dt}
=P_{\mathrm{in}}+P_{\mathrm{fusion}}-P_{\mathrm{loss}}-P_{\mathrm{out}},
$$

and, for $\omega_j^2=c^2\lambda_j+\Delta_\star$,

$$
m_{\mathrm{eff}}^2
=\frac{\hbar^2\Delta_\star}{c^4}.
$$`,
    repositories: ["geometry", "sympy"],
  },
  {
    key: "spectral-projection",
    title: "Spectral projection",
    ids: ["E57", "E58", "E59", "E60", "E61", "E62", "E63", "E64"],
    keywords: ["spectral projection", "green kernel", "projection", "shell symbol", "coherence length", "band selective"],
    markdown: String.raw`The selected wavelength is

$$
\lambda_\star
=\frac{2\pi}{k_\star}
=2\pi\sqrt{\frac{2b}{a}}.
$$

A corrected coherence length is

$$
\xi_{\mathrm{coh}}
=\left(\sum_k p_k|k|^2\right)^{-1/2}
=\sqrt{\frac{\int|\psi|^2\,dx}{\int|\nabla\psi|^2\,dx}}.
$$`,
    repositories: ["geometry", "sympy", "lean"],
  },
  {
    key: "electron",
    title: "Curvature-locked electron family",
    ids: ["CLE1", "CLE2", "CLE3", "CLE4", "CLE5", "CLE6", "CLE7", "CLE8", "CLE9", "CLE10"],
    keywords: ["curvature locked electron", "electron family", "toroidal eigenmode", "angular modes"],
    markdown: String.raw`The inverse-length convention is

$$
-\Delta\psi=\sigma_\star^2\psi,
\qquad
R=\frac1{\sigma_\star}.
$$

Periodic angular modes form

$$
f(\theta)=A\cos(m\theta)+B\sin(m\theta),
\qquad m\in\mathbb Z_{\ge0}.
$$`,
    repositories: ["geometry", "sympy"],
  },
  {
    key: "logarithmic",
    title: "Logarithmic transforms",
    ids: ["G1", "EX", "EY", "EZ", "FA"],
    keywords: ["logarithmic", "log periodic", "cole hopf", "log spectral"],
    markdown: "The canonical log sector covers log-periodic modulation, the logarithmic Laplacian identity, and Cole–Hopf reduction.",
    repositories: ["geometry", "sympy"],
  },
  {
    key: "cosmology",
    title: "Curvature-acoustic cosmology",
    ids: Array.from({ length: 20 }, (_, index) => `CM${index + 1}`),
    keywords: ["curvature acoustic", "cosmology", "photon oscillator", "baryon oscillator", "horizon wavenumber", "power spectrum"],
    markdown: "The CM1–CM20 family covers curvature density, acoustic perturbations, damping, peak metrics, horizons, and closure laws. These remain open pending full derivation and calibrated data tests.",
    repositories: ["geometry", "sympy", "lean"],
  },
];

const LEAN_ENTRIES = [
  {
    ids: ["E2"],
    title: "E2 — weighted-average denominator",
    status: "proved under displayed positivity hypothesis",
    declarations: ["densityWeightedAverage_denominator_ne_zero"],
    markdown: String.raw`$$
0<\sum_i\rho_i
\Longrightarrow
\sum_i\rho_i\ne0.
$$`,
  },
  {
    ids: ["E3"],
    title: "E3 — locking mismatch",
    status: "proved under nonnegative weights and exact finite locking",
    declarations: ["lockingMismatch_nonnegative", "lockingMismatch_zero"],
    markdown: String.raw`$$
\mathcal M
=\sum_i\rho_i(\partial_s\varphi_i-\sigma_i)^2
\ge0.
$$`,
  },
  {
    ids: ["E5"],
    title: "E5 — effective-wavenumber chain",
    status: "conditional on exact closure and constant positive weight",
    declarations: ["effectiveWavenumber_eq_loopAverage", "constantWeightedAverage_eq_loopAverage", "resolved_e5_effectiveWavenumber_chain"],
    markdown: String.raw`$$
k_{\mathrm{eff}}
=\frac{2\pi|n|}{L_s}
=\frac1{L_s}\oint_\Gamma\sigma\,ds
=\langle\sigma\rangle_w.
$$`,
  },
  {
    ids: ["E9"],
    title: "E9 — polar phase current",
    status: "proved for the displayed polar factorization",
    declarations: ["polarCurrentProduct_im", "phaseCurrent_of_polar_factorization", "conservationResidual_zero_iff"],
    markdown: String.raw`$$
\operatorname{Im}(\overline\psi\,\partial_x\psi)
=u\,\partial_x\theta.
$$`,
  },
  {
    ids: ["E13", "E14"],
    title: "E13/E14 — one-mode band-pass symbol",
    status: "exact polynomial reduction",
    declarations: ["bandpass_oneMode_symbol"],
    markdown: String.raw`$$
rA-a(-k^2A)-b(k^4A)
=(r+ak^2-bk^4)A.
$$`,
  },
  {
    ids: ["E18"],
    title: "E18 — positivity and gradient-flow sign",
    status: "proved under nonnegative energy components and dissipation",
    declarations: ["resolved_e18_energy_nonnegative", "resolved_e18_gradientFlow_descent"],
    markdown: String.raw`$$
c_1G+c_2C\ge0,
\qquad
\dot E=-V,\ V\ge0
\Longrightarrow
\dot E\le0.
$$`,
  },
  {
    ids: ["E58"],
    title: "E58 — band-selective Green kernel",
    status: "proved for r>0 and a≥0",
    declarations: ["bandGreenDenominator_pos", "bandGreenDenominator_ge_offset", "bandGreenKernel_pos", "bandGreenKernel_le_inverseOffset", "bandGreenKernel_at_shell"],
    markdown: String.raw`For

$$
G(k)=\frac1{r+a(k^2-k_\star^2)^2},
$$

Lean proves

$$
0<G(k)\le\frac1r,
\qquad
G(k_\star)=\frac1r.
$$`,
  },
  {
    ids: ["CM9"],
    title: "CM9 — first-order/second-order equivalence",
    status: "algebraic equivalence proved after identifying velocity rate with acceleration",
    declarations: ["photonSecondOrder_iff_firstOrder", "baryonSecondOrder_iff_firstOrder"],
    markdown: "Lean proves equivalence between the photon/baryon second-order oscillator equations and their first-order acceleration forms under the displayed identification.",
  },
  {
    ids: ["CM12", "CM13", "CM16"],
    title: "CM12, CM13, CM16 — formal definitions",
    status: "definitions, not theorem-level physical validations",
    declarations: ["dimensionlessPowerSpectrum", "peakPowerRatio21", "peakPowerRatio31", "peakScaleRatio21", "peakScaleRatio31", "horizonWavenumber"],
    markdown: "Lean defines the dimensionless power spectrum, peak-power and peak-scale ratios, and the horizon wavenumber.",
  },
];

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function extractEquationIds(value) {
  const text = String(value ?? "").toUpperCase();
  const matches = text.match(/\b(?:M\d+[A-Z]?|E\d+[A-Z]?|CLE\d+|CM\d+|TOP\d+|CORR\d+|G1|EX|EY|EZ|FA)\b/g) ?? [];
  return [...new Set(matches)];
}

function familyMatches(node, content) {
  const haystack = normalizeText([node?.label, node?.path, content].join(" "));
  const ids = new Set(extractEquationIds(haystack));
  return FAMILY_ENTRIES.filter((entry) =>
    entry.ids.some((id) => ids.has(id))
    || entry.keywords.some((keyword) => haystack.includes(normalizeText(keyword))),
  );
}

function leanMatches(node, content) {
  const haystack = normalizeText([node?.label, node?.path, content].join(" "));
  const ids = new Set(extractEquationIds(haystack));
  return LEAN_ENTRIES.filter((entry) => entry.ids.some((id) => ids.has(id)));
}

function repositoryMatches(node, content) {
  const families = familyMatches(node, content);
  const lean = leanMatches(node, content);
  const repositoryIds = new Set();
  for (const family of families) for (const id of family.repositories) repositoryIds.add(id);
  if (lean.length) repositoryIds.add("lean");
  if (node?.type === "Papers" || node?.type === "Equations" || node?.type === "Glossary") {
    repositoryIds.add("geometry");
  }
  return {
    repositories: [...repositoryIds].map((id) => REPOSITORIES[id]).filter(Boolean),
    families,
    lean,
    equationIds: extractEquationIds([node?.label, node?.path, content].join(" ")),
  };
}

module.exports = {
  REPOSITORIES,
  FAMILY_ENTRIES,
  LEAN_ENTRIES,
  extractEquationIds,
  repositoryMatches,
};