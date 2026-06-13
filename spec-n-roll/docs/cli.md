# CLI Reference

When you run the `spec-n-roll` CLI, its dispatcher locates the appropriate binary to execute based on your current working directory and command.

It first looks for a project-local binary by walking up the directory tree looking for `.spec-n-roll/cli/bin/spec-n-roll`. If not found, it falls back to the globally installed binary instance. Use `--global` to bypass the project-local handoff and run the globally installed CLI directly.

## spec-n-roll

Specification-driven workflow toolkit for AI coding agents

usage:

```shell
spec-n-roll [options] [command]
```

| Command               | Description                                 |
| --------------------- | ------------------------------------------- |
| [init](#init)         | Initialize Spec-N-Roll in a project         |
| [version](#version)   | Show installed Spec-N-Roll versions         |
| [list](#list)         | List toolkit resources                      |
| [update](#update)     | Update the toolkit to the latest version    |
| [config](#config)     | Configure Spec-N-Roll project settings      |
| [workflow](#workflow) | Workflow state operations                   |
| [task](#task)         | Task spec lifecycle and checkbox operations |
| [project](#project)   | Project metadata operations                 |
| [step](#step)         | Step output template operations             |
| [spec](#spec)         | spec.md frontmatter operations              |

Running the full CLI with no command starts the interactive Ink application
instead of printing Commander help. Subcommands and option-only invocations such
as `spec-n-roll init --help` and `spec-n-roll version` remain non-interactive.

### interactive mode

Interactive mode opens a keyboard-first main menu with five sections:

| Key | Section             | Purpose                                             |
| --- | ------------------- | --------------------------------------------------- |
| `1` | Task Specs          | Browse specs, inspect artifacts, and run spec tasks |
| `2` | Workflows           | Inspect configured workflow variants and steps      |
| `3` | Agents              | View, add, or remove configured coding agents       |
| `4` | Project             | View or edit Spec-N-Roll project metadata           |
| `5` | Setup / Maintenance | Initialize, view version details, or update toolkit |

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
  - `.agents/skills/spec-n-*`
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

| Flag                            | Description                                  |
| ------------------------------- | -------------------------------------------- |
| `--task-spec-id <id>`           | Numeric task spec id                         |
| `--workflow-variant-id <id>`    | Workflow variant id                          |
| `--last-completed-step-id <id>` | Last completed step id                       |
| `--current-step-id <id>`        | Current in-progress step id                  |
| `--status <status>`             | Operational status: active\|paused\|complete |

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

Step output template operations

Usage:

```shell
spec-n-roll step [command]
```

| Command                          | Description                                                   |
| -------------------------------- | ------------------------------------------------------------- |
| [instantiate](#step-instantiate) | Instantiate a step output template into a task spec directory |

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
