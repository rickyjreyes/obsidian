---
type: "equation-map"
tags:
  - "wct/equation-index"
  - "wct/dependency-map"
---

# Equation Dependency Map

> [!note]
> Solid arrows indicate direct derivation or reduction. Dashed arrows indicate structural or phenomenological connection.

## Closure to operational families

```mermaid
%%{init: {"flowchart": {"useMaxWidth": true, "nodeSpacing": 18, "rankSpacing": 26}, "themeVariables": {"fontSize": "12px"}}}%%
flowchart TB
  C1["C1 Action"]
  C2["C2 Conservation"]
  C3["C3 Winding"]
  C4["C4 Dispersion"]
  C5["C5 Scale flow"]
  A["E1-E8 Mass"]
  B["E9-E16 PFF"]
  C["E17-E23 Curvature"]
  D["E24-E27 Dimension"]
  E["E28-E34 Entropy"]
  F["E35-E43 WCC"]
  G["E44-E48 Cavity"]
  H["E49-E56 Geometry"]
  I["E57-E64 Spectral"]
  J["E65-E70 Sobolev"]
  K["E71-E76 Complexity"]
  L["E77-E82 Information"]

  C1 --> C
  C2 --> B
  C3 --> A
  A --> C4
  C4 --> C5
  C --> D
  C --> G
  C --> H
  B --> I
  I --> E
  D --> J
  E --> F
  F --> K
  C --> L
```

## Mass derivation

```mermaid
%%{init: {"flowchart": {"useMaxWidth": true}, "themeVariables": {"fontSize": "12px"}}}%%
flowchart TB
  E3["E3 Locking action"]
  E4["E4 Euler-Lagrange lock"]
  E5["E5 Effective wavenumber"]
  E6["E6 Mass-curvature law"]
  E7["E7 Solenoidal mass"]
  CLE["CLE toroidal sector"]
  K["Koide sector"]

  E3 --> E4 --> E5 --> E6 --> E7
  E7 --> CLE
  E7 -.-> K
```

## Spectral selection

```mermaid
%%{init: {"flowchart": {"useMaxWidth": true}, "themeVariables": {"fontSize": "12px"}}}%%
flowchart TB
  E12["E12 Dispersion rail"]
  E13["E13 Amplitude evolution"]
  E14["E14 Lyapunov functional"]
  E16["E16 Spectral concentration"]
  E30["E30 Spectral entropy"]
  E33["E33 Support shrinkage"]
  G1["G1 JUNO modulation"]

  E12 --> E13 --> E14
  E13 --> E16 --> E30 --> E33
  E16 -.-> G1
```

## Navigation

- [[03 Equations/00 Equations Index|Equations Index]]
