# CLI

Command-line entry points for spec-n-roll. This layer routes user intent into toolkit operations without owning workflow or file mutation logic.

The global dispatcher resolves whether to hand off to a project-local full CLI or continue in the lightweight global binary. The full CLI wires Commander subcommands and will host interactive Ink flows for init, updates, and other management tasks. Dispatch stays deliberately thin so the global npm install never loads core workflow or MCP code when delegating locally.
