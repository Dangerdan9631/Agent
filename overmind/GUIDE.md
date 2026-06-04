# Cerebrate guide

A **cerebrate** is a long-running agent instance managed by the Overmind service. Each cerebrate has its own configuration folder, command definitions, optional workflow state machine, and connection to the shared task store under your Overmind config directory.

This guide covers how to **create**, **configure**, and **use** cerebrates with the CLI. For workspace setup and package layout, see [README.md](./README.md). For workflow examples in depth, see [specs/002-cerebrate-workflows/quickstart.md](./specs/002-cerebrate-workflows/quickstart.md).

## Prerequisites

1. **Build the workspace** (Node.js 24+):

   ```bash
   cd overmind/src
   npm install
   npm run build
   ```

2. **Choose a config directory** — a folder that will hold `overmind-config.yaml`, cerebrate definitions, and tasks. Example: `./my-overmind-config`.

3. **Start the Overmind service** (once per config directory):

   ```bash
   node packages/overmind-cli/dist/bin.js start --config-dir ../my-overmind-config
   ```

   On first start, the service creates:

   - `my-overmind-config/overmind-config.yaml`
   - `my-overmind-config/cerebrates/hello/cerebrate-config.yaml` (built-in example cerebrate)

   A second `start` against the same config directory fails with an “already running” error.

4. **Optional:** set a default config path so you can omit `--config-dir`:

   ```bash
   export OVERMIND_CONFIG_DIR=/absolute/path/to/my-overmind-config
   ```

   Commands below show `--config-dir` explicitly; drop it when the variable is set.

## Config directory layout

```text
my-overmind-config/
├── overmind-config.yaml          # Service instance settings (created on first start)
├── cerebrates/
│   ├── hello/                    # One folder per cerebrate name
│   │   └── cerebrate-config.yaml
│   └── my-agent/
│       └── cerebrate-config.yaml
├── tasks/                        # Active tasks (HELO-00001/, etc.)
├── completed-tasks/
└── cancelled-tasks/
```

- The **cerebrate name** is the folder name under `cerebrates/` (e.g. `hello`, `my-agent`).
- Only **one running instance** is allowed per name.
- The service must be running before you start cerebrates.

## Create a cerebrate

### 1. Add a cerebrate folder

Create a new directory under `cerebrates/`:

```bash
mkdir -p my-overmind-config/cerebrates/my-agent
```

### 2. Add `cerebrate-config.yaml`

Every cerebrate requires `cerebrate-config.yaml` in that folder. Minimal example:

```yaml
description: My custom agent.
taskId: MYAG
nextTaskNumber: 1
responsibilities: Process MYAG tasks from the task queue.
commands:
  - name: run
    value:
      type: text
      text: Run the main loop.
  - name: shutdown
    value:
      type: text
      text: Stop this cerebrate.
  - name: attach
    value:
      type: text
      text: Attach to cerebrate output.
```

| Field | Required | Description |
|-------|----------|-------------|
| `description` | Yes | Short human-readable summary. |
| `taskId` | Yes | Four uppercase letters (`A`–`Z`). Used as the task ID prefix (e.g. `MYAG-00001`). Must be unique across cerebrates in the same config directory. |
| `nextTaskNumber` | No (default `1`) | Next sequence number when allocating tasks for this prefix. |
| `responsibilities` | Yes | What this cerebrate is responsible for. |
| `commands` | Yes | Named commands users and workflows can invoke (see below). |
| `states` | No | Workflow state definitions (see [Workflows](#workflows-optional)). |
| `workflows` | No | Named workflows referencing `states`. |

The built-in `hello` cerebrate is created automatically on first service start if missing. Its default commands are `run`, `shutdown`, and `attach`.

### 3. Define commands

Each command has a `name` and a `value` with one of these types:

| Type | Shape | Behavior when sent |
|------|--------|-------------------|
| `text` | `type: text`, `text: "..."` | Output is the JSON-serialized command value (shown in logs and returned to callers). |
| `file` | `type: file`, `file: "path"` | Same; path is part of the stored value (execution of file content is not automatic). |
| `script` | `type: script`, `script: "..."` | Same; script body is part of the stored value. |

Command names must be unique within the cerebrate. Workflow `states[].command` must reference a name from this list.

There is also a **built-in** command `check-tasks` (not defined in YAML). It is only valid while the cerebrate is in the `idle` state and triggers a scan of `tasks/` for work matching this cerebrate’s `taskId`.

### 4. Start the cerebrate

```bash
node packages/overmind-cli/dist/bin.js start-cerebrate my-agent --config-dir ../my-overmind-config
```

Expected: a log line such as `Cerebrate started: my-agent`.

Verify with stats:

```bash
node packages/overmind-cli/dist/bin.js stats --config-dir ../my-overmind-config
```

You should see `runningCerebrateCount: 1` and an entry for `my-agent` (name, runtime, idle loop count, and current state).

Starting the same name again fails: only one instance per name is allowed.

## How a running cerebrate behaves

While running, each cerebrate uses an internal state machine:

```text
initialize → idle ⟷ check-tasks → post-check → work → validate → idle
                              ↘ shutting down
```

| State | Meaning |
|-------|---------|
| `idle` | Waiting; emits periodic idle log lines (~10s). |
| `check-tasks` | Looks for the next available task under `tasks/` with ID prefix `{taskId}-`. |
| `work` / `validate` | Progresses the current task through in-progress and validating. |
| `shutting down` | Stopping. |

Send `check-tasks` via `send-command` when the cerebrate is `idle` to pull work from the task repository. The cerebrate picks the first available task whose dependencies are satisfied, then moves it through work and validation until complete.

## Tasks and your `taskId`

Tasks live under the **config directory** (not inside the cerebrate folder):

```text
my-overmind-config/tasks/MYAG-00001/task.md
```

Task IDs match `{taskId}-{5-digit-number}` (e.g. `MYAG-00001`). The service allocates new numbers using `nextTaskNumber` in the cerebrate config.

A minimal `task.md` includes a heading, status, timestamps, and sections the parser expects. When creating tasks by hand, follow the same structure the repository uses (see integration tests under `src/packages/overmind/test/unit/file-system-task-repository.test.ts` for examples).

Typical flow:

1. Add task folders under `tasks/` with IDs prefixed by your cerebrate’s `taskId`.
2. Start the cerebrate.
3. Run `send-command my-agent check-tasks` while stats show state `idle`.
4. Watch logs via `attach` (below) as the cerebrate selects and completes work.

## Use cerebrates from the CLI

All commands talk to the running service over IPC. Run from `overmind/src` after `npm run build`, or use linked `overmind` if you ran `npm link` (see [README.md](./README.md)).

| Command | Purpose |
|---------|---------|
| `start-cerebrate <name>` | Load `cerebrates/<name>/` and start the runtime. |
| `stop-cerebrate <name>` | Stop a running cerebrate. |
| `send-command <name> <command>` | Invoke a configured or built-in command. |
| `attach [name]` | Stream output (see below). |
| `start-workflow <name> <workflow>` | Start a configured workflow on a running cerebrate. |
| `stats` | Service uptime and running cerebrate summaries. |

### Send commands

```bash
node packages/overmind-cli/dist/bin.js send-command hello run --config-dir ../my-overmind-config
node packages/overmind-cli/dist/bin.js send-command hello check-tasks --config-dir ../my-overmind-config
```

The CLI prints the command output returned by the service.

### Stop a cerebrate

```bash
node packages/overmind-cli/dist/bin.js stop-cerebrate hello --config-dir ../my-overmind-config
```

### Shut down the service

When finished:

```bash
node packages/overmind-cli/dist/bin.js shutdown --config-dir ../my-overmind-config
```

If the process is stuck without IPC, use `shutdown --force`.

## Observe output with `attach`

**Named attach** — follow one cerebrate’s log stream (includes replay of recent history):

```bash
node packages/overmind-cli/dist/bin.js attach hello --config-dir ../my-overmind-config
```

In another terminal, run `send-command` or workflow steps; lines appear on the attach session.

**Unnamed attach** — follow the **service/global** log buffer (service events, workflow transition markers, aggregate logging):

```bash
node packages/overmind-cli/dist/bin.js attach --config-dir ../my-overmind-config
```

Use unnamed attach when debugging workflows or service-level messages.

## Workflows (optional)

Workflows add a declarative state machine on top of existing commands. Define `states` and `workflows` in `cerebrate-config.yaml`, then start a workflow on a **running** cerebrate.

Example excerpt:

```yaml
commands:
  - name: run
    value:
      type: text
      text: Inspect the queue.
  - name: shutdown
    value:
      type: text
      text: Stop.
states:
  - name: inspect
    command: run
    next: cleanup
    branches:
      - when:
          outputContains: "skip"
        next: END
    onError: recover
  - name: cleanup
    command: shutdown
    next: END
  - name: recover
    command: shutdown
    next: END
workflows:
  - name: daily-review
    initialState: inspect
```

Rules:

- State names must be unique; `END` is reserved as a transition target only.
- After a **successful** command, `branches` are evaluated in order; the first match wins.
- If no branch matches, the state’s `next` is used.
- On command **failure**, `onError` is used when set; otherwise the workflow fails.
- Only **one active workflow** per cerebrate at a time.

Start a workflow:

```bash
node packages/overmind-cli/dist/bin.js start-workflow hello daily-review --config-dir ../my-overmind-config
```

Watch transition lines on unnamed `attach` (markers such as `[workflow:default]`, `[workflow:branch]`, `[workflow:error]`, `[workflow:completion]`).

Full walkthrough: [specs/002-cerebrate-workflows/quickstart.md](./specs/002-cerebrate-workflows/quickstart.md).

## Programmatic control (SDK)

From TypeScript, use `overmind-sdk` after the service is running:

```typescript
import { OvermindApiFactory } from 'overmind-sdk';

const api = OvermindApiFactory.create('/path/to/my-overmind-config');

await api.startCerebrate({ name: 'my-agent' });
const { output } = await api.sendCerebrateCommand({
  cerebrateName: 'my-agent',
  command: 'run',
});
await api.startCerebrateWorkflow({
  cerebrateName: 'my-agent',
  workflowName: 'daily-review',
});
await api.stopCerebrate({ cerebrateName: 'my-agent' });
```

The CLI is a thin wrapper around these APIs; prefer the SDK for automation and tests.

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| `No cerebrate definition folder` | Folder exists at `cerebrates/<name>/` with `cerebrate-config.yaml`. |
| Invalid config on start | YAML matches the schema (unique command/state/workflow names, valid `taskId`, branch regexes, references to defined commands and states). |
| `Cerebrate is not running` | Run `start-cerebrate` first; confirm with `stats`. |
| `already running` (cerebrate) | `stop-cerebrate` before starting again. |
| `check-tasks` does nothing useful | Cerebrate must be `idle`; tasks must exist under `tasks/` with the correct `taskId` prefix and satisfied dependencies. |
| `start-workflow` fails | Cerebrate must be running; workflow and states must be valid; no other workflow active on that cerebrate. |
| CLI cannot connect | Service not started, wrong `--config-dir`, or stale process (`shutdown --force`). |

## Related documentation

- [README.md](./README.md) — packages, build, and development commands
- [specs/001-current-application-state/quickstart.md](./specs/001-current-application-state/quickstart.md) — service lifecycle baseline
- [specs/002-cerebrate-workflows/quickstart.md](./specs/002-cerebrate-workflows/quickstart.md) — workflow configuration and validation
- [specs/002-cerebrate-workflows/data-model.md](./specs/002-cerebrate-workflows/data-model.md) — workflow field reference
