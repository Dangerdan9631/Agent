---
name: "spec-n-implement"
description: "Begin implementation: living-spec updates first, then TDD from living specs."
metadata:
  author: "spec-n-roll"
  version: "0.1.2"
---

# /spec-n-implement

Tier exit step. Begins after plan/tasks (or specify-only on papercut).

## Flow (orchestration expands in later toolkit phases)

1. **Step init** — Call MCP `step_init` (or CLI `spec-n-roll step init`) with `stepId: implement` **before any work**. Execute mandatory `beforeHooks` from the response before continuing.
2. **Living specs first (FR-009)** — Update `living-specs/{domain}.feature` files documented in `plan.md` and listed as the first tasks in `tasks.md` **before** any test or production code.
3. **Tag scenarios** — Add `@spec-n-roll-{taskSpecId}` to new or modified scenarios (additive; never remove prior tags).
4. **TDD cycle** — Run Cucumber against living specs; write failing tests, then code, then refactor.
5. **Validate** — Confirm living-spec updates and implementation tasks are complete.
6. **Step finalize** — Call MCP `step_finalize` with `validationPassed: true`, then write workflow `status: complete` and lifecycle `Complete` via MCP tools when the tier finishes. Execute mandatory `afterHooks` from the finalize response.

Living specs are agent-managed (outside MCP/CLI). Machine-readable workflow and lifecycle writes use MCP/CLI only.

## User input

```text
$ARGUMENTS
```

Optional implementation focus or vertical slice to start with.
