# CLI

Command-line entry points for spec-n-roll. This layer routes user intent into toolkit operations without owning workflow or file mutation logic.

The global dispatcher resolves whether to hand off to a project-local full CLI or continue in the lightweight global binary. The full CLI starts the Ink application for bare `spec-n-roll` invocation and keeps Commander subcommands non-interactive for scripted use.

`interactive/launch.ts` owns the render lifecycle and startup context for the bare invocation path. It resolves the project root, detects initialization state, gathers binary context, and renders the shared Ink app without adding mutation behavior to the dispatch layer.
