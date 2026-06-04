# Contract: CLI Workflow Command

**Binary**: `overmind-cli` -> `overmind`

## Command

| Command | Arguments | Options | SDK call | Status |
|---------|-----------|---------|----------|--------|
| `start-workflow` | `<cerebrate> <workflow>` | `--config-dir` | `startCerebrateWorkflow({ cerebrateName, workflowName })` | Planned |

## Behavior

- Parses cerebrate name and workflow name from positional arguments
- Resolves config through `OvermindApiFactory.create(options.configDir)`
- Calls SDK `startCerebrateWorkflow`
- Prints the returned cerebrate, workflow, initial state, and status

## Errors

- Missing config dir follows existing SDK config resolution errors
- Unknown cerebrate, unknown workflow, invalid workflow config, and active workflow
  errors are surfaced from SDK/service without CLI reinterpretation

## Thin CLI Rule

The command MUST NOT:

- Load `cerebrate-config.yaml`
- Evaluate branches
- Run workflow commands
- Open IPC directly outside `overmind-sdk`
