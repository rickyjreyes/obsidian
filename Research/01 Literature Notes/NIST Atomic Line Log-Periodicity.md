---
type: literature-note
title: "Bin-Stable Log-Periodic Structure in Public NIST Atomic Line List"
aliases:
  - "Bin-Stable Log-Periodic Structure in Public NIST Atomic Line List"
citekey: "reyesBinStableLogPeriodicStructure2026"
authors: "Richard J. Reyes"
date: "2026-05-28"
year: "2026"
item_type: "preprint"
publisher: "Zenodo"
doi: "10.5281/zenodo.20435463"
zenodo_record: "https://zenodo.org/records/20435463"
pdf_url: "https://zenodo.org/records/20435463/files/Bin-Stable%20Log-Periodic%20Structure%20in%20Public%20NIST%20Atomic%20Line%20List.pdf"
categories:
  - "Particle Physics & Spectral Tests"
tags:
  - "literature-note"
  - "collection/particle-physics-&-spectral-tests"
---

# Bin-Stable Log-Periodic Structure in Public NIST Atomic Line List

> [!info] Preprint
> **Author:** Richard J. Reyes  
> **Date:** 2026-05-28  
> **Citation key:** `reyesBinStableLogPeriodicStructure2026`  
> **DOI:** [10.5281/zenodo.20435463](https://doi.org/10.5281/zenodo.20435463)  
> **Record:** [Open Zenodo record](https://zenodo.org/records/20435463)  
> **PDF:** [Open full-text PDF](https://zenodo.org/records/20435463/files/Bin-Stable%20Log-Periodic%20Structure%20in%20Public%20NIST%20Atomic%20Line%20List.pdf)

## External links

- [GitHub repository](https://github.com/rickyjreyes/NIST)
- [External source](https://physics.nist.gov/PhysRefData/ASD/lines_form.html)

## Overview

DescriptionBin-Stable Log-Periodic Structure in Public NIST Atomic Line ListsRichard J. Reyes - Original Release: May 28, 2026

## Concepts

- [[02 Concepts/Active-domain winding|Active-domain winding]]
- [[02 Concepts/Atomic line lists|Atomic line lists]]
- [[02 Concepts/Atomic spectra|Atomic spectra]]
- [[02 Concepts/Bin stability|Bin stability]]
- [[02 Concepts/Co II|Co II]]
- [[02 Concepts/Discrete Scale Invariance|Discrete Scale Invariance]]
- [[02 Concepts/Fe II|Fe II]]
- [[02 Concepts/Gaussian-smoothed baseline|Gaussian-smoothed baseline]]
- [[02 Concepts/Line-density analysis|Line-density analysis]]
- [[02 Concepts/Log-Periodic Residuals|Log-Periodic Residuals]]
- [[02 Concepts/Log-periodicity|Log-periodicity]]
- [[02 Concepts/Logarithmic wavenumber|Logarithmic wavenumber]]
- [[02 Concepts/NIST Atomic Spectra Database|NIST Atomic Spectra Database]]
- [[02 Concepts/Parametric bootstrap|Parametric bootstrap]]
- [[02 Concepts/Poisson likelihood|Poisson likelihood]]
- [[02 Concepts/Poisson log-linear model|Poisson log-linear model]]
- [[02 Concepts/Public scientific data|Public scientific data]]
- [[02 Concepts/Reproducible data analysis|Reproducible data analysis]]
- [[02 Concepts/Spectral residuals|Spectral residuals]]
- [[02 Concepts/Transition metals|Transition metals]]
- [[02 Concepts/Wave Confinement Theory|Wave Confinement Theory]]
- [[02 Concepts/Wavenumber|Wavenumber]]

## Related papers

- [[01 Literature Notes/Log-Periodic C9 Deformation|Log-Periodic C9 Deformation]]
- [[01 Literature Notes/Log-Spectral Structure in B0 Decays|Log-Spectral Structure in B0 Decays]]

## Abstract / record description

DescriptionBin-Stable Log-Periodic Structure in Public NIST Atomic Line ListsRichard J. Reyes - Original Release: May 28, 2026

GitHub: https://github.com/rickyjreyes/NIST

DescriptionThis record presents an independent reproducible line-density analysis of public NIST Atomic Spectra Database line-list exports. The study tests whether atomic transition line lists contain stable log-periodic structure when represented in logarithmic wavenumber coordinates. The analysis is not a flux-spectrum measurement and is not endorsed or certified by NIST; NIST is used only as the public data source.

The tested coordinate is:

ℓ=ln⁡(σ)\ell = \ln(\sigma)ℓ=ln(σ)

where:

• σ\sigmaσ - wavenumber in cm⁻¹• ℓ\ellℓ - logarithmic wavenumber coordinate

For each line list, wavenumbers are cleaned, optionally filtered by ionization stage, transformed into ℓ\ellℓ, binned, and compared against a Gaussian-smoothed baseline using a one-mode Poisson log-linear harmonic model.

The tested residual form is:

Δ(ℓ)∼Acos⁡(kℓ+ϕ)\Delta(\ell) \sim A \cos(k\ell + \phi)Δ(ℓ)∼Acos(kℓ+ϕ)

where:

• AAA - bounded residual amplitude• kkk - log-frequency• ϕ\phiϕ - phase offset• ℓ\ellℓ - logarithmic wavenumber coordinate

The primary canonical result is reported for Fe II. After cleaning and duplicate removal, the canonical Fe II run contains:

NFeII=9447N_{\mathrm{FeII}} = 9447NFeII=9447

unique usable lines.

Across histogram bin counts:

B∈{120,160,200}B \in \{120,160,200\}B∈{120,160,200}

Fe II yields the same best log-frequency:

k⋆=31.3265306122449k_\star = 31.3265306122449k⋆=31.3265306122449

with active-domain winding:

n⋆≈10.7n_\star \approx 10.7n⋆≈10.7

and zero null exceedances in 5000 parametric bootstrap draws for each bin setting.

A companion neighbor-ion batch analysis is included for Ni II, Co II, Cr II, Mn II, and Ti II. Among these neighboring ions, Co II is the only species that qualitatively reproduces the Fe II signature, showing bin-stable structure near:

k⋆≈30.24k_\star \approx 30.24k⋆≈30.24

with winding:

n⋆≈10.95–10.98n_\star \approx 10.95\text{–}10.98n⋆≈10.95–10.98

and zero null exceedances across the displayed bin counts.

Ni II is statistically marginal because of its smaller line count. Cr II, Mn II, and Ti II do not maintain bin-stable k⋆k_\stark⋆ at the displayed precision.

The result supports a reproducible log-periodic regularity in logarithmic atomic line-density space, especially in Fe II and secondarily in Co II. The claim is intentionally narrow: this is a bin-stability observation in public atomic line-list data, not a proof of a physical mechanism. The record separates the promoted Fe II verdict-bearing result from exploratory neighboring-ion scans and identifies baseline-sensitivity audits as a remaining validation step.

Input Data

Input data are public CSV exports from the NIST Atomic Spectra Database line-list interface.

Primary source:

NIST ASD Lines Formhttps://physics.nist.gov/PhysRefData/ASD/lines_form.html

The analysis uses exported atomic transition line lists, including Fe II and neighboring transition-metal ions. Wavenumbers are parsed from the NIST exports; if direct wavenumber values are absent, wavelength values in nm may be converted by:

σi=107λi\sigma_i = \frac{10^7}{\lambda_i}σi=λi107

with λi\lambda_iλi in nm and σi\sigma_iσi in cm⁻¹.

## Research notes

### Main claim


### Evidence and method


### Open questions


### Connections

