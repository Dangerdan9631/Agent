# Contract: Spec Manifesto

Defines storage, loading scope, and `/spec-n-manifesto` authoring behavior.

## Storage Layout

```text
.spec-n-roll/config/manifesto/
├── global.md
└── steps/
    ├── specify.md
    ├── plan.md
    └── implement.md
```

Templates copied on init from `src/templates/manifesto-global.md` and `manifesto-step.md`.

## Scopes

| Scope | Path | Loaded when |
|-------|------|-------------|
| Global | `global.md` | Every `step_init` (FR-004) |
| Step | `steps/{stepId}.md` | `step_init` only if `stepId` matches active step (FR-005) |

## Loading Contract (deterministic — core library)

`readManifestosForStep(projectRoot, stepId)` returns:

```typescript
Array<{
  scope: 'global' | 'step';
  stepId?: string;
  path: string;
  content: string;
}>
```

- Missing global file → empty global not an error; init includes diagnostic "no global manifesto defined".
- Step file for non-matching step → not included.
- Orphan step manifesto (no workflow step) → file remains; not loaded.

## `/spec-n-manifesto` Agent Skill

**Not a workflow step** — no `step_init` / `step_finalize` required (spec assumption).

### Invocation targets (exactly one per run — FR-016)

- Global: `/spec-n-manifesto global` or equivalent user intent
- Step: `/spec-n-manifesto <stepId>`

### Workflow (mirrors speckit-constitution)

1. Optional extension hooks from `.specify/extensions.yml` (`before_manifesto`, `after_manifesto`) if registered.
2. Load existing content or template with `[PLACEHOLDER]` tokens.
3. Interview maintainer for rules including:
   - Spec-n-roll processes: user interview for iterative feedback (mandatory step pattern)
   - MCP-based deterministic step execution and metadata updates
   - Reference to step init/finalize and set lists where relevant
4. Iterative feedback loop until user confirms.
5. Validate: non-empty, no unresolved placeholders, scope clarity (FR-018).
6. Save atomically; preserve prior content until confirmation (FR-019).
7. Sync impact comment optional in file header (constitution pattern).

### Conflict handling

When draft conflicts with `.specify/memory/constitution.md` or project rules, surface conflict for user resolution before save — do not silently merge.

## CLI (optional parity)

`spec-n-roll manifesto show [--global | --step <stepId>]` — read-only JSON/markdown for debugging. Authoring remains skill-primary.

## Ink (optional v1)

- `manifesto-view` route: display global + step manifestos read-only.
- Editing deferred to `/spec-n-manifesto` skill unless implementation phase includes edit form.

## Agent Response Labeling

Manifesto content in `step_init` MUST include `scope` on each entry (FR-020). When global and step rules conflict, return both with scope labels; agent treats as blocking unless manifesto text defines precedence.

## Acceptance Tests

| Scenario | Expected |
|----------|----------|
| Create global via skill flow | `global.md` exists with confirmed content |
| Create step manifesto for `plan` | Only `steps/plan.md` |
| Init for `plan` | Global + plan step manifesto |
| Init for `tasks` | Global only (no plan step file) |
| Multi-target invocation | Skill requires single target choice |
| Empty global | Init succeeds with diagnostic |
