# spec-n-roll-arch

This package owns architecture validation and dependency visualization for the workspace. It treats architecture checks as development artifacts rather than runtime behavior.

Runtime architecture keeps cross-process contracts in `spec-n-roll-api`. Dispatcher and runtime packages may depend on that API boundary, while the API package must not depend on dispatcher, runtime, SDK, MCP, architecture, or test packages.
