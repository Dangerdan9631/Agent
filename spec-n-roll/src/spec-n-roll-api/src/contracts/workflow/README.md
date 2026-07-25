# Workflow contracts

This directory contains the public, serialized vocabulary for versioned workflows and their agent-agnostic steps. Workflow ordering uses stable step identifiers, while each step references a neutral skill identifier that agent extensions may translate into native artifacts.

## Conventions

### Neutral definitions

Keep agent names, commands, prompt formats, and native artifact paths outside these contracts. Data boundaries use JSON Schema objects so transports and agent adapters can share the same definition.

### Explicit ordering

Store step definitions separately from the ordered identifier list. Consumers must validate uniqueness and reference resolution before accepting a workflow for transition or hook processing.
