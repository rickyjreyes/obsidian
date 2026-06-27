# WCT Graph Engine

A vault-local Obsidian plugin for navigating, validating, and auditing the WCT research corpus.

## What version 0.4 adds

- Full clustered graph with stable category regions.
- Recursive local connection graphs with breadcrumbs and Back navigation.
- Rich glossary, equation, paper, and general-note inspectors.
- Typed directional research relations.
- Validation rings for symbolic, formal, physical, and experimental status.
- Research-audit views for missing definitions, derivations, implementations, experiments, evidence, equation links, and validation metadata.
- Full, Reduced, and Off motion modes.
- Search across titles, paths, node types, validation states, and audit issue names.

## Open the graph

Run either command:

- `WCT Graph Engine: Open WCT Graph`
- `WCT Graph Engine: Open WCT Research Audit`

## Main controls

- **Full graph** returns to the complete clustered corpus.
- **Audit** opens the corpus closure audit.
- Click a large category node or label to enter that category.
- Click a note node to open its inspector.
- Double-click a note or choose **View connections** to enter its local graph.
- Click another note and choose **View connections** again to drill deeper.
- Use **Back** or any breadcrumb to unwind the graph path.
- Drag empty graph space to pan.
- Scroll to zoom around the pointer.
- **Fit** frames the current scene.
- **Motion** cycles Full, Reduced, and Off.
- **Rebuild** refreshes graph metadata after note changes.

## Typed research relations

Add relations in note frontmatter:

```yaml
---
relations:
  defines:
    - Curvature Feedback
  derives:
    - E17 Curvature Operator
  uses:
    - Phase-Flux Field
  predicts:
    - Finite-k Shell Selection
  tested-by:
    - Photodiode Harmonic Protocol
  implemented-by:
    - wct-sympy
  supported-by:
    - Water Cavity Experiment
---
```

Supported relation names:

- `defines`, `defined-by`
- `derives`, `derived-from`
- `uses`, `used-by`
- `predicts`, `predicted-by`
- `tests`, `tested-by`
- `implements`, `implemented-by`
- `supports`, `supported-by`
- `depends-on`
- `contradicts`
- `cites`
- `refines`
- `extends`

Underscore aliases such as `tested_by`, `implemented_by`, and `depends_on` are also accepted.

## Validation metadata

Add validation fields to frontmatter:

```yaml
---
symbolic_status: PASS
formal_status: CONDITIONAL
physical_status: OPEN
experimental_status: UNTESTED
---
```

Recognized states include:

- `PASS`
- `CONDITIONAL`
- `DEFINITION`
- `OPEN`
- `FAIL`
- `CONTRADICTED`
- `UNTESTED`
- `EMPIRICAL`
- `UNREVIEWED`

The note fill color still represents its research type. The outer ring represents its aggregate validation state.

## Research audit

The Audit view currently detects:

- glossary or concept notes without a `Definition` heading;
- equation notes without derivation relations;
- equation notes without implementation relations;
- prediction notes without experiment relations;
- experiment notes without evidence relations;
- paper notes without equation connections;
- notes without recorded validation metadata.

Click an audit group to zone into its findings. Clicking a finding opens the normal note inspector, including validation state, typed relations, and a direct link back to the relevant audit graph.

## Performance

Motion modes:

- **Full** — ambient node motion, transitions, and edge particles.
- **Reduced** — lighter motion and fewer particles.
- **Off** — redraw only when the graph changes or the user interacts.

The full vault remains indexed, while edge and label budgets limit visual overload.

## Settings

Settings are available under **Settings → WCT Graph Engine**:

- indexed folders;
- orphan-note handling;
- full-graph edge budget;
- motion mode;
- validation rings;
- typed relation arrows.

## Relationship to other graph plugins

WCT Graph Engine renders its own view. Extended Graph and Graph Presets may remain installed for Obsidian's built-in Graph View, but the older WCT Motion, Navigator, Polish, Pointer Fix, Content Details, and Panel Isolation plugins should remain disabled.