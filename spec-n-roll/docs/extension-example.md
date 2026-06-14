# Extension Example: Custom Triage

This walkthrough replaces built-in set list triage inside `/spec-n-specify` with project-local logic while keeping shared built-in steps (`plan`, `tasks`, `implement`) referenced from default workflows and set lists.

## Directory layout

```text
.spec-n-roll/config/extensions/custom-triage/
├── manifest.json
└── triage-handler.mjs
```

## manifest.json

```json
{
  "manifestVersion": "1",
  "id": "custom-triage",
  "name": "Custom Triage",
  "description": "Forces papercut set list for demo features.",
  "targetToolkitVersion": "0.1.0",
  "steps": [
    {
      "id": "custom-triage-step",
      "stepId": "triage",
      "command": "spec-n-triage",
      "entrypoint": ".spec-n-roll/config/extensions/custom-triage/triage-handler.mjs",
      "priority": 10,
      "enabledByDefault": true
    }
  ],
  "hooks": [
    {
      "id": "before-specify-audit",
      "event": "before_specify",
      "entrypoint": ".spec-n-roll/config/extensions/custom-triage/before-specify.mjs",
      "optional": true
    }
  ]
}
```

## triage-handler.mjs

```javascript
export async function handler(context) {
  const enabledSetLists = context.enabledSetLists ?? [];
  const papercut = enabledSetLists.find((entry) => entry.id === 'papercut');
  const fallback = papercut ?? enabledSetLists[0];

  return {
    mode: fallback ? 'heuristic' : 'blocking',
    proposedSetListId: fallback?.id ?? null,
    proposedWorkflowId: fallback?.workflowId ?? null,
    rationale: fallback
      ? 'Custom extension triage selected papercut set list.'
      : 'No enabled set lists.',
    eligibleSetLists: enabledSetLists.map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      priority: entry.priority,
      workflowId: entry.workflowId,
    })),
    defaultSetListId: fallback?.id ?? '',
    blocking: !fallback,
    blockingMessage: fallback ? undefined : 'Enable at least one set list.',
  };
}
```

## Register in workflow.config.json

Add to the `extensions` array:

```json
{
  "id": "custom-triage",
  "manifestPath": ".spec-n-roll/config/extensions/custom-triage/manifest.json",
  "enabled": true
}
```

## Expected behavior

1. `/spec-n-specify Fix button label` runs the extension triage handler via `import()`.
2. The toolkit logs that extension `custom-triage` is the active handler for step `triage`.
3. Setting `"enabled": false` on the registration restores built-in set list triage heuristics.
4. `before_specify` hook instructions appear in `step_init` results for the specify step (and may auto-dispatch on the CLI engine path when configured in the extension manifest).
5. A hook such as `before_typo-step` would warn at load and never dispatch.

## Shared steps across workflows

Default `workflow.config.json` from `spec-n-roll init` defines each step once under `steps[]` and references ids from `workflows[]`. Set lists in `set-lists.json` point at those workflow ids:

```json
{
  "steps": [
    { "id": "specify", "kind": "built-in", "command": "spec-n-specify", "enabled": true },
    { "id": "plan", "kind": "built-in", "command": "spec-n-plan", "enabled": true },
    { "id": "tasks", "kind": "built-in", "command": "spec-n-tasks", "enabled": true },
    { "id": "implement", "kind": "built-in", "command": "spec-n-implement", "enabled": true }
  ],
  "workflows": [
    { "id": "quick", "name": "Quick", "steps": ["specify", "tasks", "implement"] },
    { "id": "full", "name": "Full", "steps": ["specify", "plan", "tasks", "implement"] }
  ]
}
```

Both `quick` and `full` reference the same `tasks` step definition. Add or adjust set list entries with `spec-n-roll set-list` when you need different triage descriptions or priorities.

## TODO

- Example replacing `plan` with a custom extension handler.
- Example adding a custom set list that references a new workflow definition.
