# WCT Graph Engine

A vault-local Obsidian plugin that renders the WCT research graph independently of Obsidian's built-in Graph View.

## Why version 0.2 changed the layout

Rendering every note and every link simultaneously produced an unreadable hairball. Version 0.2 uses a multilevel research graph instead:

1. **Overview** — labeled supernodes for Maps, Papers, Concepts, Equations, Derivations, Predictions, Experiments, Evidence, Projects, References, and Other.
2. **Cluster view** — click an area to inspect its highest-degree notes in deterministic rings, with a limited set of meaningful internal edges.
3. **Focus view** — search for a term to display direct matches and a bounded one-hop neighborhood.

The full vault remains indexed, but only the part needed for the current question is rendered.

## Rendering architecture

- WebGL 2 draws nodes and edges in GPU batches.
- Layout is deterministic; there is no force simulation or background layout worker.
- Obsidian's `metadataCache.resolvedLinks` supplies the graph without rereading every Markdown file.
- Category-to-category relationships are aggregated in Overview.
- Cluster and search views apply explicit node and edge budgets.
- A 2D canvas overlay draws prioritized labels.
- Debounced vault and metadata events rebuild open graph views.

## Open the graph

Use the ribbon network icon or run:

- `WCT Graph Engine: Open WCT Graph`

## Controls

- Click an Overview area to drill into it.
- Click a note to open it.
- Click an external category node in Cluster view to switch categories.
- Type in the search box to show matching notes and immediate neighbors.
- Use **Back** or **Overview** to return to the top level.
- Drag to pan.
- Scroll to zoom around the pointer.
- Double-click or select **Fit** to frame the current view.
- Select **Rebuild** after changing graph settings.

## Defaults

- Includes `Research/`.
- Excludes `.obsidian/` and `Templates/`.
- Hides orphan notes.
- Displays at most 220 notes in one category.
- Displays at most 240 notes in a search-focused neighborhood.
- Displays at most 120 prioritized labels in detailed views.

Settings are available under **Settings → WCT Graph Engine**.

## Relationship to other graph plugins

This plugin does not patch or wrap the built-in Graph View. `graph-presets` and `extended-graph` can remain installed for the original graph. The temporary `wct-graph-layout-fix` compatibility plugin is removed in version 0.2.