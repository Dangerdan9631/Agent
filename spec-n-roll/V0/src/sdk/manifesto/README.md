# Manifesto

Project-scoped rules that steer agent behavior during workflow step execution. Manifestos complement the Spec Kit constitution: they capture product and process constraints agents should honor while working inside a task spec.

This module owns storage layout under `.spec-n-roll/config/manifesto/`, validation before save, and deterministic resolution of versioned global and step-scoped manifesto bodies for step lifecycle orchestration. Workflow configuration declares a registry of stable manifesto identities and ordered references; global references load first on every step, followed by the active step's references.

Resolution is agent-neutral and guidance-only. Sources must remain inside the user-owned manifesto configuration directory, input schemas and templates describe approved read-only context, and declared tool or MCP requirements are compatibility metadata for later execution integration. Required failures block initialization while optional failures produce persisted skipped provenance. Step declarations cannot replace rule identities marked protected by a loaded global manifesto.

Projects without versioned declarations retain the legacy `global.md` and `steps/{stepId}.md` loading behavior.

Authoring is agent-skill driven (`/spec-n-manifesto`); CLI, MCP, and Ink surfaces delegate reads and writes through this module rather than duplicating path or validation rules.
