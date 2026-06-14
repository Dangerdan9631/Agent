# Extension Quickstart

Extensions let a project replace or augment built-in workflow steps and register `before_{stepId}` / `after_{stepId}` hooks without forking the toolkit.

## What ships today

- Extension manifests are validated with Zod (`src/extensions/manifest.ts`) and must match `specs/001-spec-n-roll-toolkit/contracts/extension-manifest.schema.json`.
- `workflow.config.json` lists extension registrations under `extensions[]` with `id`, `manifestPath`, and `enabled`.
- Enabled extension steps replace built-in handlers for the same open `stepId`; highest `priority` wins.
- Disabled extensions fall back to built-in handlers automatically.
- Hook events use `before_{stepId}` and `after_{stepId}` only. `before_update` and `after_update` are rejected.
- Unknown hook step ids produce warnings at manifest load and are skipped at dispatch.
- Handlers are invoked in-process via Node `import()` from project-relative `entrypoint` paths.

## Register a workflow-only extension

1. Create `.spec-n-roll/config/extensions/{id}/manifest.json`.
2. Add a handler module and reference it from a `steps[]` entry:

```json
{
  "manifestVersion": "1",
  "id": "custom-triage",
  "name": "Custom Triage",
  "targetToolkitVersion": "0.1.0",
  "steps": [
    {
      "id": "custom-triage-step",
      "stepId": "triage",
      "command": "spec-n-triage",
      "entrypoint": ".spec-n-roll/config/extensions/custom-triage/triage-handler.mjs",
      "priority": 10
    }
  ]
}
```

3. Register the extension in `.spec-n-roll/config/workflow.config.json`:

```json
{
  "extensions": [
    {
      "id": "custom-triage",
      "manifestPath": ".spec-n-roll/config/extensions/custom-triage/manifest.json",
      "enabled": true
    }
  ]
}
```

4. Export a handler from the entrypoint module:

```javascript
export async function handler(context) {
  const enabledSetLists = context.enabledSetLists ?? [];
  const proposed = enabledSetLists.find((entry) => entry.id === 'quick') ?? enabledSetLists[0];
  return {
    mode: 'heuristic',
    proposedSetListId: proposed?.id ?? null,
    proposedWorkflowId: proposed?.workflowId ?? null,
    rationale: 'Custom triage logic.',
    eligibleSetLists: enabledSetLists.map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      priority: entry.priority,
      workflowId: entry.workflowId,
    })),
    defaultSetListId: proposed?.id ?? '',
    blocking: false,
  };
}
```

Running `/spec-n-specify` uses the custom triage handler while the extension is enabled. Set `"enabled": false` on the registration to restore built-in set list triage.

## Add hooks

```json
{
  "hooks": [
    {
      "id": "audit-before-plan",
      "event": "before_plan",
      "entrypoint": ".spec-n-roll/config/extensions/custom-triage/before-plan.mjs"
    }
  ]
}
```

Hooks whose `{stepId}` is not in the merged step registry warn at load time and are skipped during collection and dispatch.

On the **agent path**, before/after hooks for a step are returned as call instructions from `step_init` and `step_finalize` (from both `.specify/extensions.yml` and extension manifest hooks). The CLI engine path may still auto-dispatch extension manifest handlers in-process for built-in automatic steps.

## TODO

- Publishing and versioning guidance for third-party extension packages outside the project tree.
- Interactive CLI helpers for scaffolding extension directories.
