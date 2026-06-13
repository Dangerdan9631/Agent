# Extension Reference

## Manifest fields

| Field                  | Required | Description                                                                  |
| ---------------------- | -------- | ---------------------------------------------------------------------------- |
| `manifestVersion`      | yes      | Manifest document version string.                                            |
| `id`                   | yes      | Unique kebab-case extension id.                                              |
| `name`                 | yes      | Human-readable title.                                                        |
| `targetToolkitVersion` | yes      | Toolkit semver the extension was built against.                              |
| `description`          | no       | Short summary.                                                               |
| `entrypoint`           | no       | Optional package-level handler module path.                                  |
| `steps`                | no       | Workflow step replacements keyed by open `stepId`.                           |
| `hooks`                | no       | Dynamic `before_{stepId}` / `after_{stepId}` handlers.                       |
| `workflowVariants`     | no       | Additional named variants referencing registered step ids.                   |
| `agentSetup`           | no       | Required for agent extensions; omitted for workflow-only extensions. |

Authoritative JSON Schema: `specs/001-spec-n-roll-toolkit/contracts/extension-manifest.schema.json`.

## Step contributions

Each `steps[]` entry replaces or augments a workflow slot:

| Field              | Required | Description                                                                                        |
| ------------------ | -------- | -------------------------------------------------------------------------------------------------- |
| `id`               | yes      | Unique id within the manifest.                                                                     |
| `stepId`           | yes      | Open kebab-case workflow step id (`triage`, `plan`, `tasks`, custom ids).                          |
| `command`          | yes      | Agent-facing `spec-n-*` command name.                                                              |
| `entrypoint`       | yes      | Project-relative module path exported for `import()`.                                              |
| `priority`         | no       | Integer; highest value wins when multiple extensions target the same `stepId`.                     |
| `enabledByDefault` | no       | Defaults to `true`; set `false` to keep the step contribution off unless explicitly enabled later. |

Resolution rules:

1. Ignore disabled extension registrations from `workflow.config.json`.
2. Ignore step contributions with `enabledByDefault: false`.
3. Choose the enabled contribution with the highest `priority`.
4. When no enabled extension targets the `stepId`, use the built-in handler.

The workflow engine logs an `activeHandlerNotice` describing the selected handler.

## Hook events

Hook `event` values must match:

```text
^(before|after)_{stepId}
```

Examples: `before_specify`, `after_plan`, `before_triage`.

Reserved and rejected: `before_update`, `after_update`.

At manifest load the toolkit builds a merged step registry from:

- `workflow.config.json` `steps[]`
- implicit ids such as `triage`
- on-demand ids `clarify` and `analyze`
- enabled extension `stepId` values

Hooks targeting unknown step ids:

- emit a warning during registry load
- are recorded in `skippedHooks`
- are not dispatched

Optional hooks (`optional: true`, default) log and continue when the handler fails. Required hooks (`optional: false`) fail the step with remediation guidance.

## Handler contract

Entrypoint modules must export `handler` (or default export) as an async function:

```typescript
export async function handler(context: Record<string, unknown>): Promise<unknown>;
```

The toolkit resolves project-relative paths with `import()`. Handler failures throw an error that includes remediation text.

### Triage handler result

Custom `triage` handlers should return a `TriageAssessment` object compatible with `src/specs/triage.ts`:

- `mode`: `heuristic` or `manual`
- `proposedWorkflowVariantId`
- `rationale`
- `availableWorkflowVariantIds`
- `defaultWorkflowVariantId`

## Workflow variants

`workflowVariants[]` entries add named compositions on top of `workflow.config.json` variants. Variant `steps[]` arrays reference shared step ids from the config `steps[]` registry rather than duplicating step definitions.

Default tier variants (`papercut`, `quick`, `full`) are written during `spec-n-roll init` and always list `specify` as step 1.

## Registration in workflow.config.json

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

Bundled agent extensions installed by `init` live under `.spec-n-roll/bundled-extensions/{agentId}/manifest.json` and are also listed here.

## Compatibility

`targetToolkitVersion` is compared against `.spec-n-roll/compatibility.json` during `spec-n-roll update`. Mismatches are warnings only and do not block updates or workflow execution.

## TODO

- Formal TypeScript type packages for extension handler contracts.
- Documented extension discovery outside `workflow.config.json` registrations.
