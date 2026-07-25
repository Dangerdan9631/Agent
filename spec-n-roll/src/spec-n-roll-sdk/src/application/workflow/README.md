# Workflow application layer

This directory owns transport-independent workflow transitions. It invokes hooks
with immutable snapshots, validates their proposed context changes, records
outcomes, and retains exclusive control over lifecycle fields.

## Conventions

### Hook execution

Treat hook results as proposals. Validate every patch before producing a new
state, and do not mutate either the caller-owned state or the hook snapshot.

### Completion

A successful pre-hook activates a step. A step becomes complete only after its
post-hook returns `continue`; other statuses remain explicit lifecycle outcomes.

