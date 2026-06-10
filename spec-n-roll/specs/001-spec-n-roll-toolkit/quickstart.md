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

Expected outcome: `spec-n-roll version` reports the global CLI version.

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

- A local CLI copy is installed into the project.
- Agent-specific rules/skills/commands are generated for each selected agent.
- `workflow.config.json` contains papercut, quick, and full tier variants — each listing shared `specify` as step 1.
- `project-metadata.json` includes `nextTaskSpecId: 1`.
- Toolkit-owned and user-owned directories are separate.
- The CLI does not verify that selected agents are installed.

## Scenario 2: Global CLI Delegates to Local CLI

From inside the initialized project:

```powershell
spec-n-roll version
spec-n-roll --global version
```

Expected outcomes:

- Without `--global`, the global CLI delegates to the local project CLI.
- With `--global`, the global CLI runs directly.
- Output identifies global and local versions when both are available.

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
- The resulting `spec.md` has YAML frontmatter with `status: Active` and no unresolved critical placeholders.
- `workflow-state.json` contains numeric `taskSpecId` and required `slug`.

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

## Scenario 9: Extension Workflow Variant

Register an extension that replaces built-in triage logic within `specify` and contributes a custom workflow variant.

Expected outcomes:

- The extension manifest validates against `contracts/extension-manifest.schema.json`.
- Extension `entrypoint` is invoked in-process via Node `import()`.
- The workflow config validates against `contracts/workflow-config.schema.json`.
- `/spec-n-specify` can select a workflow tier through embedded triage.
- Shared built-in steps are referenced rather than duplicated.
- If the extension is disabled, the built-in behavior is used.

## Scenario 10: Task Spec Lifecycle and Locking

Complete a workflow, then start a non-specify step on a different task spec.

Expected outcomes:

- Completed spec has `status: Complete` in `spec.md` frontmatter after implement finishes.
- When a different task spec begins a non-specify step, prior Complete specs transition to `status: Locked` in frontmatter.
- Write attempts to Locked task spec directories are rejected.

## Scenario 11: Documentation Completeness

Review `docs/`.

Expected outcomes:

- Overall workflow documentation covers all steps and interactions (including triage embedded in specify).
- CLI documentation covers setup, update, modify/configuration, local delegation, and `--global`.
- Multi-agent setup and switching are documented.
- Platform script variant behavior is documented.
- Extension documentation includes a quick-start, reference, and fully worked example.
- Update and migration documentation explains ownership, backups, schema migration, and compatibility warnings.
