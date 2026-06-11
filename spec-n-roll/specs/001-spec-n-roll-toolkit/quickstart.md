# Quickstart: Spec-n-Roll Toolkit Validation

This guide defines end-to-end validation scenarios for the planned implementation. Commands are intentionally written against the public CLI and generated workflow surfaces.

## Prerequisites

- Node.js 20+
- npm or pnpm
- Git
- PowerShell on Windows
- Bash or sh on macOS/Linux

## Setup

```powershell
npm install
npm run build
npm link
```

Expected outcome: `spec-n-roll version` (non-interactive) reports the dispatcher and full CLI versions via the combined version report.

## Scenario 1: Initialize a Project with Multiple Agents

```powershell
mkdir tmp-init-project
cd tmp-init-project
spec-n-roll init .
```

During the Ink prompts:

- Select at least two agents.
- Select both PowerShell and shell script variants.
- Accept the default workflow.

Expected outcomes:

- Full CLI binary is installed at `.spec-n-roll/cli/bin/spec-n-roll` (+ `.cmd` on Windows).
- MCP server binary is installed at `.spec-n-roll/cli/bin/spec-n-roll-mcp` (+ `.cmd` on Windows).
- Each selected agent's project-local native MCP config file (per `contracts/agent-mcp-config.md`) contains a `spec-n-roll` server entry pointing at the local MCP binary (stdio) — not the global dispatcher or full CLI.
- Unrelated MCP server entries in pre-existing agent config files are preserved (merge is idempotent).
- Agent-specific rules/skills/commands are generated for each selected agent.
- `workflow.config.json` contains papercut, quick, and full tier variants — each listing shared `specify` as step 1.
- `project-metadata.json` includes `nextTaskSpecId: 1`.
- Toolkit-owned and user-owned directories are separate.
- The CLI does not verify that selected agents are installed.

## Scenario 1b: Add Agent MCP Configuration

In an initialized multi-agent project:

```powershell
spec-n-roll config add-agent
```

Select an agent not yet configured.

Expected outcomes:

- Rules and skills are generated for the new agent only.
- The new agent's project-local MCP config file is created or merged with a `spec-n-roll` server entry → `.spec-n-roll/cli/bin/spec-n-roll-mcp`.
- Previously configured agents' MCP config files are unchanged.
- Re-running `config add-agent` for the same agent is idempotent (no duplicate server entries).

## Scenario 2: Dispatcher Exec's Local Full CLI

From inside the initialized project:

```powershell
spec-n-roll version
spec-n-roll --global version
```

Expected outcomes:

- Without `--global`, the global dispatcher exec's the local full CLI binary (does not load full CLI code in-process).
- With `--global`, the co-bundled global full CLI executes; local binary is not consulted.
- Combined version report shows dispatcher version, executed binary version, `local`/`global` target, and absolute local binary path when local.
- Direct invocation of `.spec-n-roll/cli/bin/spec-n-roll -v` reports binary version and indicates direct invocation.

## Scenario 2b: Interactive vs Non-Interactive CLI

```powershell
spec-n-roll
spec-n-roll init --help
```

Expected outcomes:

- Bare `spec-n-roll` spawns the Ink interactive terminal.
- `spec-n-roll <subcommand>` runs non-interactively, prints help or result, and exits synchronously.

## Scenario 3: Interactive Specification with Embedded Triage

Run the generated agent command in a configured agent:

```text
/spec-n-specify Add a vague reporting feature
```

Expected outcomes:

- The agent explores available project context before asking questions that files can answer.
- Triage runs at the start of `specify` (before the interview), proposes a tier with rationale, and persists `workflowVariantId` after confirmation.
- The agent asks exactly one targeted question at a time during the interview.
- Each question includes a recommended answer.
- Resolved answers are recorded in the task spec and are not re-asked.
- `spec.md` is instantiated via MCP `step_output_instantiate` (or CLI `step instantiate`) before prose edits.
- The resulting `spec.md` has YAML frontmatter with `status: Active` (set via MCP/CLI, not direct YAML edit) and no unresolved critical placeholders.
- `workflow-state.json` contains numeric `taskSpecId` and required `slug` (written via MCP/CLI).

## Scenario 4: `/spec-n-roll` Advances Workflow State

Run:

```text
/spec-n-roll
```

Expected outcomes:

- The command reads the task spec workflow state file.
- It advances to the next incomplete step in the selected tier variant.
- If state is missing or unreadable, it falls back to tier-aware artifact detection.
- If state conflicts with artifacts, it warns once and asks for a single confirmation.
- Absence of `plan.md` on papercut/quick tiers is not treated as an error.

## Scenario 5: Interrupted Step Recovery

Create partial artifacts for the next step (per step output manifest), then run:

```text
/spec-n-roll
```

Expected outcomes:

- The command presents exactly three choices: restart, cancel, and force-clean.
- Detection uses the built-in step output manifest (not per-file ad hoc checks).
- Restart overwrites all partial artifacts for the step.
- Cancel leaves artifacts in place and marks the workflow paused.
- Force-clean deletes all partial artifacts for the step and restarts.
- The command does not prompt per artifact.

## Scenario 6: Living Spec and TDD Entry

Run:

```text
/spec-n-implement
```

Expected outcomes:

- The current task is validated and written to `project-metadata.json` (`currentTaskSpecId` + `currentTaskSlug`).
- Only one Active task spec can be in implementation.
- Living specs under `living-specs/{kebab-case-domain}.feature` are created or updated before test or production code.
- New or modified scenarios receive the current `@spec-n-roll-{numeric-id}` tag.
- Existing task tags are preserved.
- Cucumber runs directly against living spec `.feature` files.
- Unmapped steps receive clearly marked stub step definitions.
- The first implementation cycle starts red, then green, then refactor.

## Scenario 7: TDD Vertical Slice Enforcement

During implementation, choose one behavior from the task list.

Expected outcomes:

- One behavior test is added through a public interface.
- The test fails before implementation.
- Minimal code is added to pass that behavior.
- Refactoring happens only after the test is green.
- Tests remain behavior-focused and do not assert private implementation details.

## Scenario 8: Safe Toolkit Update

In an initialized fixture project:

1. Modify a toolkit-owned file.
2. Modify a user-owned config file.
3. Register an extension manifest targeting an older toolkit version.
4. Run:

```powershell
spec-n-roll update
```

Expected outcomes:

- The modified toolkit-owned file receives a `.bak` copy before overwrite.
- The user-owned config file is preserved unless a confirmed migration applies.
- Config schema migrations happen only during update.
- Extension compatibility mismatches appear as warnings.
- Warnings do not block update completion.
- All configured agents' project-local MCP config files have refreshed `spec-n-roll` server paths when the local MCP binary or `.cmd` wrapper changes.

## Scenario 9: Extension Workflow Variant

Register an extension that replaces built-in triage logic within `specify` and contributes a custom workflow variant.

Expected outcomes:

- The extension manifest validates against `contracts/extension-manifest.schema.json`.
- Extension step contributions use `stepId` (open kebab-case string), not a closed `phase` enum.
- Hook events use `before_{stepId}` / `after_{stepId}` pattern validation (e.g. `before_specify`, `after_custom-gate`).
- `before_update` / `after_update` are rejected by schema validation.
- Extension `entrypoint` is invoked in-process via Node `import()`.
- The workflow config validates against `contracts/workflow-config.schema.json`.
- `/spec-n-specify` can select a workflow tier through embedded triage.
- Shared built-in steps are referenced rather than duplicated.
- If the extension is disabled, the built-in behavior is used.

## Scenario 9b: Extension Hook Validation

Register an extension with a hook targeting an unknown `stepId` (e.g. `before_typo-step`).

Expected outcomes:

- Manifest load succeeds (non-blocking).
- The toolkit emits a warning identifying the unknown `stepId`.
- The invalid hook is skipped at dispatch.
- Workflow execution continues normally for registered steps.

## Scenario 10: Task Spec Lifecycle and Locking

Complete a workflow, then start a non-specify step on a different task spec.

Expected outcomes:

- Completed spec has `status: Complete` in `spec.md` frontmatter after implement finishes.
- When a different task spec begins a non-specify step, prior Complete specs transition to `status: Locked` in frontmatter.
- Write attempts to Locked task spec directories are rejected.

## Scenario 11: MCP/CLI Parity for Deterministic Mutations

Using an initialized project with an Active task spec:

1. Set task status via CLI: `spec-n-roll task status set --task-spec-id 001 --slug <slug> --status Complete`
2. Verify the same operation is available as MCP tool `task_spec_status_set`.
3. Attempt to toggle a `tasks.md` checkbox via MCP `task_checkbox_set` and confirm CLI `task checkbox set` produces identical file state.

Expected outcomes:

- Each core-library mutation in `contracts/mcp-tools.md` has a matching non-interactive CLI subcommand.
- Machine-readable fields are not modified by direct agent file edits in skills.
- Living spec files remain outside MCP/CLI scope.

## Scenario 12: Documentation Completeness

Review the toolkit repository root `docs/` directory (not installed into initialized projects).

Expected outcomes:

- Overall workflow documentation covers all steps and interactions (including triage embedded in specify).
- CLI documentation covers setup, update, modify/configuration, dispatcher exec model, MCP registration, interactive vs non-interactive modes, and `--global`.
- MCP tool documentation mirrors CLI subcommands for deterministic mutations.
- Multi-agent setup and switching are documented.
- Platform script variant behavior is documented.
- Extension documentation includes a quick-start, reference, and fully worked example.
- Update and migration documentation explains ownership, backups, schema migration, and compatibility warnings.
