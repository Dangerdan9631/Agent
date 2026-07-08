# Cytoscape infrastructure domain - src/spec-n-roll-arch/src/infrastructure/cytoscape

This directory contains Cytoscape and dependency matrix artifact writing. It owns serialization and browser-renderable output details for graph and matrix views.

## Conventions

### Artifact writing

Keep HTML, JSON, Cytoscape rendering, and dependency matrix presentation details here. Do not add package policy or dependency analysis decisions to writers. Layout state is read by generated graph HTML from sibling `.layout.json` files and written through the local architecture viewer HTTP server. Diagram image exports are posted to the same server so PNG files are persisted next to their HTML pages. Dark-mode preference is stored in browser `localStorage` under a shared key so it persists across generated pages.
