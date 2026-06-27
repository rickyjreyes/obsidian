# WCT Graph Engine

A vault-local Obsidian plugin for navigating, validating, auditing, and replaying the evolution of the WCT research corpus.

## Version 0.5

Version 0.5 adds the bridge from a Markdown graph toward a semantic research operating system:

- creation-date idea timeline;
- play, pause, restart, scrub, and selectable timelapse duration;
- adjustable **Center**, **Repel**, and **Link distance** forces;
- stable object IDs displayed in the inspector;
- semantic object categories for claims, theorems, contradictions, and artifacts;
- suppression of obvious parser fragments such as `authors`, `aliases`, `comment`, `overview`, and one-letter definitions;
- custom ID-link resolution for links such as `[[art_83f18cbcdb2d]]`;
- repaired reference connections to both corpus source notes and imported artifact notes;
- search by stable ID, type, status, audit finding, path, and date;
- all 0.4 validation, relation, audit, breadcrumb, and recursive subgraph features.

## Commands

- `WCT Graph Engine: Open WCT Graph`
- `WCT Graph Engine: Open WCT Research Audit`
- `WCT Graph Engine: Open WCT Idea Timeline`

## Timeline

Open **Timeline** from the graph toolbar or use the command palette.

Controls:

- **Play / Pause** — runs the corpus from its earliest recorded creation date to its latest.
- **Restart** — returns to the first date.
- **Timeline slider** — manually scrubs through creation history.
- **Duration** — 8, 18, 30, or 60 seconds.
- **Center** — strength that pulls nodes toward their chronological position and the graph centerline.
- **Repel** — local node repulsion.
- **Link distance** — target length of connected edges.

Date priority:

1. `idea_date`
2. `created`
3. `created_at`
4. `creation_date` or `date_created`
5. `date`
6. file creation time
7. file modification time

For accurate historical playback, add explicit `idea_date` or `created` metadata instead of relying only on filesystem timestamps.

## Stable object identity

The inspector now displays:

- stable ID;
- whether the ID came from frontmatter or was temporarily derived from the path;
- creation date;
- date source;
- semantic type.

Existing generated object IDs such as:

```yaml
id: obj_1dcc2d3a2afb
```

are treated as stable identifiers. Objects without an explicit ID receive a temporary type-prefixed path hash and appear in the audit as **Objects missing stable IDs**. The long-term compiler should issue permanent IDs such as `DEF-*`, `EQ-*`, `CLA-*`, `EXP-*`, `REF-*`, and `THM-*` at extraction time.

## Semantic generated-object filter

`WaveLock Research/Objects` and `WaveLock Research/Artifacts` are now indexed alongside `Research`.

The semantic filter keeps meaningful generated objects and hides obvious extraction noise, including:

- single letters;
- `authors`;
- `aliases`;
- `comment`;
- `family`;
- `overview`;
- `figure`;
- `table`;
- generic `claim`, `definition`, or `research notes` nodes.

Citation-shaped text is reclassified as **References**, even when an earlier extractor labeled it as a definition.

The filter can be disabled under **Settings → WCT Graph Engine → Semantic object filter** for inspection of the raw extractor output.

## Repaired references

A generated reference object can now connect through two independent mechanisms:

```markdown
[[WCT Corpus Sources 082-114#^SRC-097|citation text]]
[[art_83f18cbcdb2d]]
```

The first resolves to the corpus source note. The second resolves through the target note's frontmatter ID, even though the artifact filename is different.

Reference edges are typed as:

- `CITES →` for corpus source notes;
- `DERIVED FROM →` for imported artifact notes.

## Search syntax

Examples:

```text
id:obj_1dcc2d3a2afb
type:References
status:conditional
audit:missing-stable-id
after:2025-01-01
before:2026-01-01
type:Equations status:pass
"curvature locking"
```

Supported filters:

- `id:` or `uuid:`
- `type:`
- `status:`
- `audit:`
- `path:`
- `after:`
- `before:`

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

```yaml
---
symbolic_status: PASS
formal_status: CONDITIONAL
physical_status: OPEN
experimental_status: UNTESTED
---
```

The note fill color represents semantic type. The outer ring represents aggregate validation state.

## Research audit

The Audit view detects:

- glossary objects without definitions;
- equations without derivation relations;
- equations without implementation relations;
- predictions without experiment relations;
- experiments without evidence relations;
- papers without equation links;
- unreviewed validation state;
- generated objects without explicit stable IDs.

## Main graph controls

- **Full graph** — complete clustered corpus.
- **Audit** — corpus closure audit.
- **Timeline** — creation-date timelapse and force view.
- Click a category node or label to enter it.
- Click a note to open its inspector.
- Double-click a note or choose **View connections** for a recursive local graph.
- Use **Back** or breadcrumbs to unwind.
- Drag empty space to pan.
- Scroll to zoom.
- **Fit** frames the scene.
- **Motion** cycles Full, Reduced, and Off.
- **Rebuild** refreshes metadata and generated-object links.

## Relationship to the research compiler

The graph now understands semantic object metadata, but it does not replace the extraction compiler. The compiler remains responsible for:

- issuing permanent type-specific UUIDs;
- distinguishing concepts from headings and sentence fragments;
- extracting structured references;
- extracting equations with variables, dimensions, dependencies, proof, simulation, and validation state;
- extracting claims with evidence and contradiction state;
- extracting executable experiment objects.

See `Research/00 Maps/WCT Research Compiler V2.md` for the target architecture.

## Other graph plugins

Extended Graph and Graph Presets may remain installed for Obsidian's built-in Graph View. The older WCT Motion, Navigator, Polish, Pointer Fix, Content Details, and Panel Isolation plugins should remain disabled.