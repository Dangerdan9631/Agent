# CLI Commands

Commander subcommand implementations for non-interactive toolkit management. This layer wires user-facing CLI verbs such as init, update, and config to orchestration logic without duplicating core mutations.

Interactive Ink flows delegate to sibling modules under `cli/ink/` while deterministic writes route through the core library.
