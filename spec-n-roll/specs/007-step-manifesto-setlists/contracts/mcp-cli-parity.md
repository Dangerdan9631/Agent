# Contract: MCP / CLI Parity (Feature 007 Additions)

Amends `tests/contract/mcp-cli-parity.test.ts` coverage for new tools and commands.

## New MCP Tools

| MCP Tool | CLI Equivalent | Core Function |
|----------|----------------|---------------|
| `step_init` | `step init` | `runStepInit` |
| `step_finalize` | `step finalize` | `runStepFinalize` |
| `set_list_read` | `set-list list` / `set-list show` | `readSetLists` |
| `set_list_triage` | (MCP-primary; CLI optional `set-list triage`) | `evaluateSetListTriage` |

## Parity Rules (unchanged from feature 001/006)

1. Same input parameters (modulo CLI flag parsing).
2. Same JSON structure on success.
3. Same error codes and messages on failure.
4. `projectRoot` = `process.cwd()` for both surfaces.

## Error Shape

```json
{
  "error": true,
  "code": "LIFECYCLE_INIT_REQUIRED",
  "message": "step finalize requires step init for step 'plan'"
}
```

## Contract Test Matrix

Each row runs MCP tool and CLI command with equivalent args; deep-equal JSON comparison.

| Case | MCP | CLI |
|------|-----|-----|
| Init happy path | `step_init` | `step init --task-spec-id 007 --slug test --step-id plan` |
| Finalize without init | `step_finalize` | `step finalize ...` |
| Set list list | `set_list_read` | `set-list list` |
| Set list triage | `set_list_triage` | `set-list triage --intent "..."` |

## Skill Metadata (non-MCP)

Managed skills in `.agents/skills/spec-n-*/SKILL.md` MUST include after refresh:

```yaml
metadata:
  author: spec-n-roll
  version: "0.x.y"
```

Verified by `tests/contract/workflow-skills-metadata.test.ts` (new).

## Acceptance

All parity tests pass in CI. No MCP-only fields hidden from CLI JSON output.
