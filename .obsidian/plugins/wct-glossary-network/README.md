# WCT Glossary Network

This plugin turns the glossary into a first-class layer of the WCT Graph.

## Graph behavior

- Every note under `Research/02 Concepts/` is treated as a glossary-definition node.
- The single `WCT Glossary.md` index is folded into Maps instead of appearing as a one-note glossary category.
- Selecting **Glossary** in WCT Graph opens the complete definition network.
- Clicking a glossary node opens an expanded side panel rather than immediately leaving the graph.
- The panel shows the definition, its role in the corpus, related definitions, and papers using the term.
- **Map connections** creates a local overview around the selected term, separating connected definitions, papers, equations, maps, references, and other notes into bounded rings.

## Commands

- `WCT Glossary Network: Open glossary definitions in WCT Graph`
- `WCT Glossary Network: Open Glossary Overview Map`
- `WCT Glossary Network: Synchronize expanded definitions into all glossary notes`

The synchronization command is idempotent. It inserts or replaces a marked block in every `Research/02 Concepts/*.md` note containing:

- the glossary definition;
- a short corpus-role statement;
- the Glossary Overview Map link;
- related definitions;
- papers using the term;
- instructions for opening the interactive local map.

## Central map

The static entry point is:

`Research/00 Maps/Glossary Overview Map.md`
