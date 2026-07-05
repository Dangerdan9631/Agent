# Manifesto

Project-scoped rules that steer agent behavior during workflow step execution. Manifestos complement the Spec Kit constitution: they capture product and process constraints agents should honor while working inside a task spec.

This module owns storage layout under `.spec-n-roll/config/manifesto/`, validation before save, and deterministic loading of global and step-scoped manifesto bodies for step lifecycle orchestration. Global manifestos apply on every step init; step manifestos apply only when the active workflow step id matches the filename under `steps/`.

Authoring is agent-skill driven (`/spec-n-manifesto`); CLI, MCP, and Ink surfaces delegate reads and writes through this module rather than duplicating path or validation rules.
