# Extensions

Contracts for agent and workflow extensions bundled with or registered in a project. This layer describes how third-party or built-in packages declare steps, hooks, and workflow variants without prescribing how they are loaded or executed.

Extension manifests capture identity, toolkit compatibility, contributed workflow steps (bound to open step IDs), dynamic before/after hook events, and optional variant definitions. Validation enforces naming conventions and rejects unsupported lifecycle hooks so the extension surface stays predictable across agents.
