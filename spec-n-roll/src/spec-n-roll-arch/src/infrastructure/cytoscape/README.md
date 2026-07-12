# Cytoscape infrastructure domain - src/spec-n-roll-arch/src/infrastructure/cytoscape

This directory contains Cytoscape and dependency matrix artifact writing. It owns serialization and browser-renderable output details for graph and matrix views.

## Conventions

### Artifact writing

Keep HTML, JSON, Cytoscape rendering, and dependency matrix presentation details here. Do not add package policy or dependency analysis decisions to writers. Layout state is read by generated graph HTML from sibling `.layout.json` files and written through the local architecture viewer HTTP server. New diagrams use the deterministic auto layout, which groups compound folder and module nodes and orders each group level by dependencies that remain within that group. Auto layout scopes itself to a selected compound node when one is selected, and its row limit and gaps are adjusted through the viewer toolbar; the optional vertical mode transposes the layout while retaining horizontal and vertical axis gaps. Configured gaps are measured between the rendered boundaries of compound groups. Diagram image exports are posted to the same server so PNG files are persisted next to their HTML pages. Dark-mode preference is stored in browser `localStorage` under a shared key so it persists across generated pages.

Graph and matrix writers render the supplied navigation tree with indentation and permanently visible groups. Diagram image export chooses the PNG background from the active light or dark viewer canvas. The graph toolbar can export its current diagram or sequentially export every generated Cytoscape diagram while excluding dependency matrices. It can also snap all diagram nodes, or the descendants of a selected expanded group, to a configurable 5-unit grid increment.

Declaration nodes use separate class, interface, and other colors. Reference edges are solid while combined implements/extends inheritance edges are dashed; matrices display these as `R`, `I`, or `R+I`.

The landscape viewer can persist a split or unsplit decision for a selected external dependency through its toolbar. Split nodes remain identically labelled but are keyed by their importing workspace package.
