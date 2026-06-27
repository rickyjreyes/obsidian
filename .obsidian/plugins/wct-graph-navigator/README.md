# WCT Graph Navigator

This plugin makes the full WCT vault graph the home view and adds recursive, node-centered navigation.

## Root view

- All indexed notes remain visible.
- Notes are arranged in deterministic research-area clusters.
- The graph keeps all nodes while applying an edge budget to prevent the overview from becoming an unreadable hairball.
- Motion and collision-aware labels remain active through the existing WCT Graph Motion and WCT Graph Polish plugins.

## Selection

Click any real node to open a side panel. The panel adapts to the note type:

- glossary/concept: definition or synthesis;
- equation: rendered equation and meaning;
- paper: abstract, summary, or core claim;
- map, experiment, reference, project, or other note: best available summary.

The panel also groups its connected notes by type and provides:

- **Open note**
- **View connections**
- **Back one level**
- **Full graph**

## Recursive subviews

**View connections** creates a bounded local graph around the selected node. Select another node, inspect it, and choose **View connections** again to go another level deeper.

Breadcrumbs show the complete navigation path:

`Full graph › Curvature Feedback › Emergent Mass › Density-Weighted Curvature`

Use any breadcrumb or **Back** to unwind without losing the earlier subviews.

## Hover

Hover previews include:

- title;
- note type;
- graph degree;
- vault path;
- a short definition, abstract, equation meaning, or summary;
- highest-degree connected notes.

## Commands

- `WCT Graph Navigator: Open full graph`
- `WCT Graph Navigator: Back one connection level`
