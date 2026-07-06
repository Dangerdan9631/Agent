# Cytoscape infrastructure domain - src/spec-n-roll-arch/src/infrastructure/cytoscape

This directory contains Cytoscape artifact writing. It owns serialization and browser-renderable output details for graph views.

## Conventions

### Artifact writing

Keep HTML, JSON, and Cytoscape rendering details here. Do not add package policy or dependency analysis decisions to writers. Layout state is read by generated HTML from sibling `.layout.json` files and written through the local architecture viewer HTTP server.
