# WCT Graph Engine

A vault-local Obsidian plugin that renders the WCT research graph independently of Obsidian's built-in Graph View.

## Rendering architecture

- WebGL 2 draws nodes and edges in GPU batches.
- A Web Worker performs the force-directed layout outside the UI thread.
- Typed arrays transfer positions and edge indices efficiently.
- Viewport culling uploads only visible nodes and nearby edges.
- A lightweight 2D overlay draws only the highest-degree labels visible at the current zoom.
- Obsidian's `metadataCache.resolvedLinks` supplies the graph without rereading every Markdown file.
- Debounced vault and metadata events rebuild open graph views incrementally.
- Deferred Obsidian views remain unloaded until their tab is revealed.

## Open the graph

Use the ribbon network icon or run:

- `WCT Graph Engine: Open WCT Graph`

## Controls

- Drag to pan.
- Scroll to zoom around the pointer.
- Double-click or select **Fit** to frame the graph.
- Type in the search box to show matching notes and their immediate neighbors.
- Click a node to open its note.
- Select **Pause layout** to stop the worker.
- Select **Rebuild** after changing graph settings.

## Defaults

- Includes `Research/`.
- Excludes `.obsidian/` and `Templates/`.
- Hides orphan notes.
- Supports up to 6,000 indexed nodes by default.
- Draws at most 140 labels, ranked by link degree.

Settings are available under **Settings → WCT Graph Engine**.

## Relationship to other graph plugins

This plugin does not patch or wrap the built-in Graph View. `graph-presets` and `extended-graph` can remain installed for the original graph. WCT Graph uses its own view type, layout worker, GPU buffers, camera, filtering, and interaction layer.