# CLI Reference

When you run the `spec-n-roll` CLI, its dispatcher locates the appropriate binary to execute based on your current working directory and command.

It first looks for a project-local binary by walking up the directory tree looking for `.spec-n-roll/cli/bin/spec-n-roll`. If not found, it falls back to the globally installed binary instance. Use `--global` to bypass the project-local handoff and run the globally installed CLI directly.

## spec-n-roll

Specification-driven workflow toolkit for AI coding agents

usage:

```shell
spec-n-roll [options] [command]
```

| Command                 | Description                                 |
| ----------------------- | ------------------------------------------- |
| [init](#init)           | Initialize Spec-N-Roll in a project         |
| [version](#version)     | Show installed Spec-N-Roll versions         |
| [list](#list)           | List toolkit resources                      |
| [update](#update)       | Update the toolkit to the latest version    |
| [config](#config)       | Configure Spec-N-Roll project settings      |
| [workflow](#workflow)   | Workflow state operations                   |
| [task](#task)           | Task spec lifecycle and checkbox operations |
| [project](#project)     | Project metadata operations                 |
| [step](#step)           | Step lifecycle and template operations      |
| [set-list](#set-list)   | Set list configuration and triage           |
| [manifesto](#manifesto) | Read Spec Manifesto content                 |
| [spec](#spec)           | spec.md frontmatter operations              |

Running the full CLI with no command starts the interactive Ink application
instead of printing Commander help. Subcommands and option-only invocations such
as `spec-n-roll init --help` and `spec-n-roll version` remain non-interactive.

### interactive mode

Interactive mode opens a keyboard-first main menu:

| Key | Section             | Purpose                                                      |
| --- | ------------------- | ------------------------------------------------------------ |
| `1` | Project             | Project metadata, Spec Manifestos (read-only), and set lists |
| `2` | Agents              | View, add, or remove configured coding agents                |
| `3` | Workflows           | Inspect configured workflow definitions and steps            |
| `4` | Extensions          | Placeholder for future extension management                  |
| `5` | Manage Spec N' Roll | Initialize, view version details, or update toolkit          |
| `6` | Quit                | Exit the interactive application                             |

From **Project**, numeric shortcuts include **Spec Manifestos** (view) and **Set Lists** (list, detail, edit). Task spec browsing is available from the specs flow within the app navigation stack.

Global keyboard bindings are available throughout the app:

| Key          | Action                   |
| ------------ | ------------------------ |
| `Arrow keys` | Move focus through lists |
| `Enter`      | Select the focused item  |
| `b` / `Esc`  | Go back one screen       |
| `?`          | Toggle key hints         |
| `q`          | Quit cleanly             |

Interactive mutations route through the same core operations and command
orchestrators as the CLI subcommands below. Destructive flows, including toolkit
updates, agent removal, and workflow-state overwrites, require explicit
confirmation before files are written.

## init

Initialize Spec-N-Roll in a project

Usage:

```shell
spec-n-roll init [options] [path]
```

| Flag                | Description                                         |
| ------------------- | --------------------------------------------------- |
| `[path]`            | Project directory to initialize (default: ".")      |
| `--agents <agents>` | Comma-separated agent ids (e.g. cursor,claude-code) |

Available agents can be found using the `spec-n-roll list agents` command.

**Also creates** (under the target project):

- `.spec-n-roll/config/set-lists.json` with default set lists (`papercut`, `quick`, `full`)
- `.spec-n-roll/config/manifesto/` layout and `global.md` from the toolkit template when absent
- Workflow skills under `.agents/skills/spec-n-*` including `spec-n-manifesto`

## version

Show installed Spec-N-Roll versions

Usage:

```shell
spec-n-roll version [options]
```

## list

List toolkit resources

Usage:

```shell
spec-n-roll list [command]
```

| Command                | Description               |
| ---------------------- | ------------------------- |
| [agents](#list-agents) | List all available agents |

### list agents

List all available agents

Usage:

```shell
spec-n-roll list agents [options]
```

| Flag        | Description                                                     |
| ----------- | --------------------------------------------------------------- |
| `--enabled` | List only agents installed and enabled in this project's config |

Prints each agent id and display name. Use these ids with `init --agents` and `config agent add`.

## update

Update the toolkit to the latest version

Usage:

```shell
spec-n-roll update [options]
```

| Flag        | Description                                  |
| ----------- | -------------------------------------------- |
| `--dry-run` | Preview update changes without applying them |
| `--force`   | Apply breaking config migrations             |

**Behavior:**

- Preserves user-owned files
  - `.spec-n-roll/config/`
  - `specs/` (migrates config file schemas)
  - `living-specs/`
- Overwrites binaries, scripts, skills, and extensions in toolkit-owned paths
  - `.agents/skills/spec-n-*` (managed workflow skills; user-owned skills outside the managed manifest are preserved)
  - `.spec-n-roll/` (except `config/`)
- Writes `.bak` backups for locally modified toolkit-owned files before overwrite.
- Refreshes Spec-N-Roll MCP server paths for all configured agents.
- Applies config schema migrations.
- Reports extension compatibility warnings.

## config

Configure Spec-N-Roll settings

Usage:

```shell
spec-n-roll config [command]
```

| Command                | Description                        |
| ---------------------- | ---------------------------------- |
| [agent](#config-agent) | Manage configured AI coding agents |

### config agent

Manage configured AI coding agents

Usage:

```shell
spec-n-roll config agent [command]
```

| Command                        | Description                                  |
| ------------------------------ | -------------------------------------------- |
| [add](#config-agent-add)       | Add agents to the project configuration      |
| [remove](#config-agent-remove) | Remove agents from the project configuration |

### config agent add

Add agents to the project configuration

Usage:

```shell
spec-n-roll config agent add <agents>
```

| Argument   | Description                                                   |
| ---------- | ------------------------------------------------------------- |
| `<agents>` | Comma-separated agent ids to add (e.g. `copilot,claude-code`) |

Adds rules, skills pointers, extension manifests, and MCP config for the specified agents. Existing agents remain unchanged.
Available agents can be found using the `spec-n-roll list agents` command.

### config agent remove

Remove agents from the project configuration

Usage:

```shell
spec-n-roll config agent remove <agents>
```

| Argument   | Description                                                      |
| ---------- | ---------------------------------------------------------------- |
| `<agents>` | Comma-separated agent ids to remove (e.g. `copilot,claude-code`) |

Removes the agents from `workflow.config.json`, deletes agent-specific rules and extension manifests, and removes the Spec-N-Roll MCP server entry from each agent's MCP config. Other configured agents and unrelated MCP servers remain unchanged.

## workflow

Workflow state operations

Usage:

```shell
spec-n-roll workflow [command]
```

| Command                  | Description                        |
| ------------------------ | ---------------------------------- |
| [state](#workflow-state) | read and write workflow-state.json |

### workflow state

Read and write workflow-state.json

Usage:

```shell
spec-n-roll workflow state [command]
```

| Command                        | Description                          |
| ------------------------------ | ------------------------------------ |
| [read](#workflow-state-read)   | Read workflow state for a task spec  |
| [write](#workflow-state-write) | Write workflow state for a task spec |

### workflow state read

Read workflow state for a task spec

Usage:

```shell
spec-n-roll workflow state read [options]
```

| Flag                  | Description                     |
| --------------------- | ------------------------------- |
| `--task-spec-id <id>` | Numeric task spec id (e.g. 001) |

The slug is resolved automatically from the matching `specs/{id}-{slug}/` directory.

### workflow state write

Write workflow state for a task spec

Usage:

```shell
spec-n-roll workflow state write [options]
```

| Flag                            | Description                                                   |
| ------------------------------- | ------------------------------------------------------------- |
| `--task-spec-id <id>`           | Numeric task spec id                                          |
| `--workflow-variant-id <id>`    | Selected set list’s linked workflow id (persisted field name) |
| `--last-completed-step-id <id>` | Last completed step id                                        |
| `--current-step-id <id>`        | Current in-progress step id                                   |
| `--status <status>`             | Operational status: active\|paused\|complete                  |

## task

Task spec lifecycle and checkbox operations

Usage:

```shell
spec-n-roll task [command]
```

| Command                    | Description                |
| -------------------------- | -------------------------- |
| [status](#task-status)     | Task spec lifecycle status |
| [checkbox](#task-checkbox) | tasks.md checkbox toggles  |

### task status

Task spec lifecycle status

Usage:

```shell
spec-n-roll task status [command]
```

| Command                 | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| [set](#task-status-set) | Set task spec lifecycle status in spec.md frontmatter |

### task status set

Set task spec lifecycle status in spec.md frontmatter

Usage:

```shell
spec-n-roll task status set [options] <status>
```

| Argument | Description              |
| -------- | ------------------------ |
| `status` | Active\|Complete\|Locked |

| Flag                  | Description          |
| --------------------- | -------------------- |
| `--task-spec-id <id>` | Numeric task spec id |

### task checkbox

tasks.md checkbox toggles

Usage:

```shell
spec-n-roll task checkbox [command]
```

| Command                   | Description                                       |
| ------------------------- | ------------------------------------------------- |
| [set](#task-checkbox-set) | Toggle one or more tasks.md checkboxes by task id |

### task checkbox set

Toggle one or more tasks.md checkboxes by task id

Usage:

```shell
spec-n-roll task checkbox set <completed> [options]
```

| Argument    | Description   |
| ----------- | ------------- |
| `completed` | true or false |

| Flag                  | Description                           |
| --------------------- | ------------------------------------- |
| `--task-spec-id <id>` | Numeric task spec id                  |
| `--task-id <ids...>`  | One or more task ids (e.g. T042 T043) |

## project

Project metadata operations

Usage:

```shell
spec-n-roll project [command]
```

| Command                       | Description                      |
| ----------------------------- | -------------------------------- |
| [metadata](#project-metadata) | project-metadata.json read/write |

### project metadata

project-metadata.json read/write

Usage:

```shell
spec-n-roll project metadata [command]
```

| Command                          | Description                         |
| -------------------------------- | ----------------------------------- |
| [read](#project-metadata-read)   | Read project-metadata.json          |
| [write](#project-metadata-write) | Update project-metadata.json fields |

### project metadata read

Read project-metadata.json

Usage:

```shell
spec-n-roll project metadata read [options]
```

### project metadata write

Update project-metadata.json fields

Usage:

```shell
spec-n-roll project metadata write [options]
```

| Flag                                | Description                         |
| ----------------------------------- | ----------------------------------- |
| `--next-task-spec-id <n>`           | Next task spec id counter           |
| `--current-task-spec-id <id>`       | Current implementation task spec id |
| `--implementation-started-at <iso>` | Implementation start timestamp      |

When `--current-task-spec-id` is provided, the slug is resolved from the matching task spec directory.

## step

Step lifecycle and template operations

Usage:

```shell
spec-n-roll step [command]
```

| Command                          | Description                                                   |
| -------------------------------- | ------------------------------------------------------------- |
| [init](#step-init)               | Initialize a workflow step (manifestos, before hooks)         |
| [finalize](#step-finalize)       | Finalize a step after validation (after hooks, completion)    |
| [instantiate](#step-instantiate) | Instantiate a step output template into a task spec directory |

### step init

Initialize a workflow step before agent work begins. Returns manifesto context, before-hook instructions, and lifecycle metadata as JSON.

Usage:

```shell
spec-n-roll step init [options]
```

| Flag                  | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `--task-spec-id <id>` | Numeric task spec id                                 |
| `--slug <slug>`       | Task spec slug (resolved from id when omitted)       |
| `--step-id <id>`      | Workflow step id (e.g. `plan`, `tasks`, `implement`) |

MCP equivalent: `step_init`.

### step finalize

Finalize a workflow step after the agent validates step output. Returns after-hook instructions and records completion when eligible. Direct `workflow state write` attempts that advance `lastCompletedStepId` without a prior successful finalize are rejected when lifecycle metadata is active.

Usage:

```shell
spec-n-roll step finalize [options]
```

| Flag                         | Description                                    |
| ---------------------------- | ---------------------------------------------- |
| `--task-spec-id <id>`        | Numeric task spec id                           |
| `--slug <slug>`              | Task spec slug (resolved from id when omitted) |
| `--step-id <id>`             | Workflow step id being finalized               |
| `--validation-passed <bool>` | `true` or `false` — agent attests validation   |

MCP equivalent: `step_finalize`.

### step instantiate

Instantiate a step output template into a task spec directory

Usage:

```shell
spec-n-roll step instantiate [options]
```

| Flag                      | Description                             |
| ------------------------- | --------------------------------------- |
| `--task-spec-id <id>`     | Numeric task spec id                    |
| `--step-id <id>`          | Step id: specify\|plan\|tasks           |
| `--frontmatter <pair...>` | Frontmatter key=value pairs for spec.md |

## spec

spec.md frontmatter operations

Usage:

```shell
spec-n-roll spec [command]
```

| Command                          | Description                    |
| -------------------------------- | ------------------------------ |
| [frontmatter](#spec-frontmatter) | Non-status frontmatter updates |

### spec frontmatter

Non-status frontmatter updates

Usage:

```shell
spec-n-roll spec frontmatter [command]
```

| Command                            | Description                                      |
| ---------------------------------- | ------------------------------------------------ |
| [update](#spec-frontmatter-update) | Merge non-status fields into spec.md frontmatter |

### spec frontmatter update

Merge non-status fields into spec.md frontmatter

Usage:

```shell
spec-n-roll spec frontmatter update [options]
```

| Flag                  | Description                 |
| --------------------- | --------------------------- |
| `--task-spec-id <id>` | Numeric task spec id        |
| `--field <pair...>`   | Frontmatter key=value pairs |

## set-list

Configure set lists that drive workflow triage during specify. Set lists are ordinary project data in `.spec-n-roll/config/set-lists.json` — disable, rename, or add entries without toolkit code changes.

Usage:

```shell
spec-n-roll set-list [command]
```

| Command                        | Description                                     |
| ------------------------------ | ----------------------------------------------- |
| [list](#set-list-list)         | List configured set lists as JSON               |
| [show](#set-list-show)         | Show one set list entry                         |
| [create](#set-list-create)     | Add a new set list                              |
| [update](#set-list-update)     | Update name, description, workflow, or priority |
| [enable](#set-list-enable)     | Include a set list in triage                    |
| [disable](#set-list-disable)   | Exclude a set list from triage                  |
| [remove](#set-list-remove)     | Delete a set list entry                         |
| [validate](#set-list-validate) | Validate references and enabled-count rules     |
| [triage](#set-list-triage)     | Evaluate user intent against enabled set lists  |

### set-list list

```shell
spec-n-roll set-list list [--include-disabled]
```

### set-list show

```shell
spec-n-roll set-list show <id>
```

### set-list create

```shell
spec-n-roll set-list create --id <id> --name <name> --description <text> --workflow-id <id> --priority <n> [--enabled]
```

### set-list update

```shell
spec-n-roll set-list update <id> [--name <name>] [--description <text>] [--workflow-id <id>] [--priority <n>]
```

### set-list enable / disable / remove / validate

```shell
spec-n-roll set-list enable <id>
spec-n-roll set-list disable <id>
spec-n-roll set-list remove <id>
spec-n-roll set-list validate
```

### set-list triage

```shell
spec-n-roll set-list triage --intent "<natural language description>"
```

MCP equivalents: `set_list_read`, `set_list_triage`.

## manifesto

Read Spec Manifesto content stored under `.spec-n-roll/config/manifesto/`. Authoring uses the `/spec-n-manifesto` agent skill (interview-driven, like Spec Kit constitution editing).

Usage:

```shell
spec-n-roll manifesto [command]
```

| Command                 | Description                                       |
| ----------------------- | ------------------------------------------------- |
| [show](#manifesto-show) | Print global and/or step manifesto bodies as JSON |

### manifesto show

```shell
spec-n-roll manifesto show [--global] [--step <stepId>]
```

When neither flag is provided, returns all manifesto entries the toolkit can read (global plus any step files present).

## MCP server tools

The project-local MCP server (`.spec-n-roll/cli/bin/spec-n-roll-mcp`) exposes deterministic mutations mirroring CLI subcommands. Agents should prefer MCP tools over direct file edits for machine-readable artifacts.

| Tool                      | CLI equivalent (when present) | Purpose                                      |
| ------------------------- | ----------------------------- | -------------------------------------------- |
| `workflow_state_read`     | `workflow state read`         | Read `workflow-state.json`                   |
| `workflow_state_write`    | `workflow state write`        | Write workflow state (finalize gate applies) |
| `task_spec_status_set`    | `task status set`             | Set `spec.md` lifecycle status               |
| `project_metadata_read`   | `project metadata read`       | Read project metadata                        |
| `project_metadata_write`  | `project metadata write`      | Update project metadata                      |
| `task_checkbox_set`       | `task checkbox set`           | Toggle `tasks.md` checkboxes                 |
| `step_init`               | `step init`                   | Step boundary before work                    |
| `step_finalize`           | `step finalize`               | Step boundary after validation               |
| `step_output_instantiate` | `step instantiate`            | Copy step output templates                   |
| `spec_frontmatter_update` | `spec frontmatter update`     | Merge non-status spec frontmatter            |
| `set_list_read`           | `set-list list` / `show`      | Read set list configuration                  |
| `set_list_triage`         | `set-list triage`             | Evaluate intent against enabled set lists    |

All tools use `process.cwd()` as the project root and return JSON text content on success.
