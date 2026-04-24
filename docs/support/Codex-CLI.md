# Codex CLI — Comprehensive Directive Files Reference

OpenAI **Codex CLI** (`codex`) is a lightweight, open-source coding agent that runs locally in your terminal. It shares the same directive file system (AGENTS.md, skills, hooks, rules, subagents) as the Codex desktop app and web/cloud interface, giving you consistent project context and behaviors across every surface.

- GitHub: <https://github.com/openai/codex>
- Official docs: <https://developers.openai.com/codex>

---

## Table of Contents

1. [Installation](#installation)
2. [File Structure Overview](#file-structure-overview)
3. [AGENTS.md — Custom Instructions](#agentsmd--custom-instructions)
   - [Discovery Order](#discovery-order)
   - [Format & Examples](#format--examples)
   - [Troubleshooting Discovery](#troubleshooting-discovery)
4. [config.toml — User Configuration](#configtoml--user-configuration)
5. [.codex/rules/ — Shell Command Execution Rules](#codexrules--shell-command-execution-rules)
6. [Skills](#skills)
   - [Skill Locations](#skill-locations)
   - [Skill Structure & SKILL.md Format](#skill-structure--skillmd-format)
   - [Enabling & Disabling Skills](#enabling--disabling-skills)
7. [Subagents & Custom Agents](#subagents--custom-agents)
   - [Built-in Agents](#built-in-agents)
   - [Custom Agent TOML Schema](#custom-agent-toml-schema)
   - [Global Subagent Settings](#global-subagent-settings)
   - [Example Custom Agents](#example-custom-agents)
8. [Hooks](#hooks)
   - [Feature Flag & Platform Notes](#feature-flag--platform-notes)
   - [Hook File Locations](#hook-file-locations)
   - [Config Shape](#config-shape)
   - [Matcher Patterns](#matcher-patterns)
   - [Common Input Fields](#common-input-fields)
   - [Common Output Fields](#common-output-fields)
   - [Events Reference](#events-reference)
   - [Complete Example hooks.json](#complete-example-hooksjson)
9. [Non-interactive Mode (codex exec)](#non-interactive-mode-codex-exec)
10. [Differences from Codex Web/Cloud](#differences-from-codex-webcloud)
11. [Capabilities Summary Table](#capabilities-summary-table)
12. [Sources](#sources)

---

## Installation

### npm (recommended)

```sh
npm install -g @openai/codex
```

### Homebrew (macOS)

```sh
brew install --cask codex
```

### Binary

Download the appropriate binary for your platform from the [latest GitHub Release](https://github.com/openai/codex/releases/latest).

### Authentication

After installing, run `codex` and sign in with your ChatGPT account (Plus, Pro, Business, Edu, or Enterprise plan) or with an OpenAI API key. For CI/automation use `CODEX_API_KEY` environment variable.

---

## File Structure Overview

```
~/.codex/
├── AGENTS.md                     # User global instructions
├── AGENTS.override.md            # User global override instructions (takes precedence)
├── config.toml                   # User configuration
├── hooks.json                    # User global hooks (feature flag required)
├── rules/
│   └── default.rules             # User global shell command execution rules
└── agents/                       # User global custom agents
    └── *.toml

<repo>/
├── AGENTS.md                     # Repo root instructions
├── AGENTS.override.md            # Repo root override (takes precedence over AGENTS.md)
└── .codex/
    ├── agents/                   # Project custom agents
    │   └── *.toml
    ├── rules/                    # Project shell command execution rules (NOT instructions)
    │   └── *.rules
    └── hooks.json                # Project hooks (feature flag required)

subdir/
└── AGENTS.md                     # Nested instructions (Codex walks root→CWD, one per dir)

.agents/
└── skills/
    └── <skill-folder>/
        └── SKILL.md              # Project skills (scanned from CWD up to repo root)

$HOME/.agents/skills/             # User global skills
/etc/codex/skills/                # Admin/system skills
```

> **Note:** The Codex home directory defaults to `~/.codex`. Override with the `CODEX_HOME` environment variable for per-project automation profiles.

---

## AGENTS.md — Custom Instructions

`AGENTS.md` files provide persistent instructions, context, and conventions that Codex reads before doing any work. By layering global guidance with project-specific overrides you get consistent behavior across every repository you open.

### Discovery Order

Codex builds the instruction chain **once per run** (once per TUI session). Discovery follows this precedence order:

#### 1. Global scope (`~/.codex/`)

Codex reads the **first non-empty** file it finds:

1. `~/.codex/AGENTS.override.md` — if it exists and is non-empty, use it
2. `~/.codex/AGENTS.md` — otherwise fall back to this

Only one file is used at the global level.

#### 2. Project scope (Git root → CWD)

Starting at the project root (typically the Git root), Codex **walks down** to your current working directory. In each directory along the path, it checks in order:

1. `AGENTS.override.md` — if present and non-empty, use it (skips `AGENTS.md` in that directory)
2. `AGENTS.md` — otherwise
3. Any filenames listed in `project_doc_fallback_filenames` (config knob) — as a last resort

Codex includes **at most one file per directory**.

#### 3. Merge order

Files are **concatenated root-first**, joined by blank lines. Files closer to your CWD appear later and therefore **override** earlier guidance. The combined size is capped at `project_doc_max_bytes` (32 KiB by default).

#### Visual Summary

```
~/.codex/AGENTS.override.md   ← global (first non-empty wins)
  OR ~/.codex/AGENTS.md

<git-root>/AGENTS.md          ← project root
<git-root>/subdir/AGENTS.md   ← intermediate directories
<cwd>/AGENTS.override.md      ← most specific (overrides CWD AGENTS.md)
  OR <cwd>/AGENTS.md
```

### Format & Examples

`AGENTS.md` files are **plain Markdown**. Codex treats the entire file as developer instructions.

#### Global user instructions

```markdown
# ~/.codex/AGENTS.md

## Working agreements

- Always run `npm test` after modifying JavaScript files.
- Prefer `pnpm` when installing dependencies.
- Ask for confirmation before adding new production dependencies.
- Follow the repository's existing code style; do not reformat unrelated files.
```

#### Repository root instructions

```markdown
# AGENTS.md

## Repository expectations

- Run `npm run lint` before opening a pull request.
- Document public utilities in `docs/` when you change behavior.
- Keep commits focused; one logical change per commit.
- All new functions must have corresponding unit tests.
```

#### Subdirectory override

```markdown
# services/payments/AGENTS.override.md

## Payments service rules

- Use `make test-payments` instead of `npm test`.
- Never rotate API keys without notifying the security channel.
- Changes to billing logic require a second reviewer.
```

#### Custom fallback filename in config

If your repo already uses a different filename (e.g., `TEAM_GUIDE.md`), add it to the fallback list in `~/.codex/config.toml`:

```toml
project_doc_fallback_filenames = ["TEAM_GUIDE.md", ".agents.md"]
```

Codex will then check each directory in this order: `AGENTS.override.md` → `AGENTS.md` → `TEAM_GUIDE.md` → `.agents.md`.

### Troubleshooting Discovery

| Symptom | Fix |
|---|---|
| Nothing loads | Verify `codex status` shows expected workspace root; ensure files are non-empty |
| Wrong guidance appears | Check for `AGENTS.override.md` higher in the tree or under `~/.codex/` |
| Fallback names ignored | Confirm `project_doc_fallback_filenames` has no typos; restart Codex |
| Instructions truncated | Raise `project_doc_max_bytes` or split large files across nested directories |
| Profile confusion | Run `echo $CODEX_HOME`; a non-default value points to a different home directory |

**Verify your setup:**

```sh
# Echo active instruction sources from repo root
codex --ask-for-approval never "Summarize the current instructions."

# Confirm nested overrides
codex --cd services/payments --ask-for-approval never "Show which instruction files are active."

# Check session log
~/.codex/log/codex-tui.log
```

---

## config.toml — User Configuration

Located at `~/.codex/config.toml`. Controls global defaults, feature flags, and instruction discovery behavior.

```toml
# ~/.codex/config.toml

# Add alternate instruction filenames as fallbacks when AGENTS.md is absent
project_doc_fallback_filenames = ["TEAM_GUIDE.md", ".agents.md"]

# Increase the max combined size of loaded instruction files (default: 32768 bytes)
project_doc_max_bytes = 65536

# Path for SQLite state used by agent jobs
# sqlite_home = "~/.codex/state"

# Enable experimental features
[features]
# Required to use hooks (currently disabled on Windows)
codex_hooks = true

# Subagent concurrency settings
[agents]
max_threads = 6       # Max concurrent open agent threads (default: 6)
max_depth = 1         # Max agent nesting depth; 0 = root only (default: 1)
# job_max_runtime_seconds = 1800  # Per-worker timeout for CSV batch jobs

# Disable a specific skill without deleting it
[[skills.config]]
path = "/path/to/skill/SKILL.md"
enabled = false
```

---

## .codex/rules/ — Shell Command Execution Rules

> **Important:** `.codex/rules/` is for **shell command execution rules only** — controlling which CLI commands are allowed, blocked, or require prompting. It is **not** for instruction or context files (use `AGENTS.md` for that).

Rules use a `.rules` file format based on [Starlark](https://github.com/bazelbuild/starlark/blob/master/spec.md) (Python-like syntax designed to be safe and side-effect-free).

Rules files are placed under `~/.codex/rules/` (user global) or `.codex/rules/` (project). Codex scans all `rules/` directories at startup.

### Rule syntax: `prefix_rule()`

```python
# ~/.codex/rules/default.rules

# Allow git operations without prompting
prefix_rule(
    pattern = ["git", "add"],
    decision = "allow",
    justification = "Safe staging operation",
    match = ["git add .", "git add -p"],
    not_match = ["git add --force /etc"],
)

# Prompt before viewing PRs outside the sandbox
prefix_rule(
    pattern = ["gh", "pr", "view"],
    decision = "prompt",
    justification = "Viewing PRs is allowed with approval",
    match = [
        "gh pr view 7888",
        "gh pr view --repo openai/codex",
        "gh pr view 7888 --json title,body,comments",
    ],
    not_match = [
        # Does not match because pattern must be an exact prefix
        "gh pr --repo openai/codex view 7888",
    ],
)

# Block dangerous filesystem operations
prefix_rule(
    pattern = ["rm", "-rf"],
    decision = "forbidden",
    justification = "Use safer deletion alternatives; confirm manually if needed",
)

# Allow or prompt based on subcommand alternatives
prefix_rule(
    pattern = ["npm", ["install", "i", "add"]],
    decision = "prompt",
    justification = "Installing packages requires review",
)
```

### `prefix_rule()` fields

| Field | Required | Description |
|---|---|---|
| `pattern` | Yes | List defining the command prefix. Each element is a literal string or a list of alternatives at that position. |
| `decision` | No (default: `"allow"`) | `"allow"`, `"prompt"`, or `"forbidden"`. Most restrictive decision wins when multiple rules match. |
| `justification` | No | Human-readable reason surfaced in approval prompts or rejection messages. |
| `match` | No | Inline unit test examples that **should** match this rule. |
| `not_match` | No | Inline unit test examples that **should not** match this rule. |

### Decision precedence

`forbidden` > `prompt` > `allow`

### Compound commands

For `bash -lc "cmd1 && cmd2"` style invocations, Codex uses tree-sitter to parse and split simple linear chains before evaluating rules. If the script uses advanced shell features (redirections, substitutions, variables, wildcards, control flow), it is evaluated as a single `["bash", "-lc", "<full script>"]` invocation.

### Testing rules

```sh
codex execpolicy check --pretty \
  --rules ~/.codex/rules/default.rules \
  -- gh pr view 7888 --json title,body,comments
```

---

## Skills

Skills extend Codex with task-specific capabilities. A skill packages instructions, resources, and optional scripts so Codex can follow a workflow reliably. Skills follow the open [Agent Skills standard](https://agentskills.io/) and are supported by many AI tools beyond Codex.

Skills use **progressive disclosure**: Codex loads only the `name` and `description` at startup. The full `SKILL.md` instructions are loaded into context only when Codex decides to use a skill.

### Skill Locations

Codex reads skills from the following locations, scanned in order:

| Scope | Path | Use case |
|---|---|---|
| **REPO** | `$CWD/.agents/skills/` | Skills for the current working directory (e.g., a microservice folder) |
| **REPO** | `$CWD/../.agents/skills/` | Skills for a parent folder (nested repos) |
| **REPO** | `$REPO_ROOT/.agents/skills/` | Skills shared across the whole repository |
| **USER** | `$HOME/.agents/skills/` | Personal skills that apply to any repository |
| **ADMIN** | `/etc/codex/skills/` | Machine/container-level skills; SDK scripts and admin defaults |
| **SYSTEM** | Bundled with Codex | Built-in skills from OpenAI (e.g., `skill-creator`, `plan`) |

- Codex scans `.agents/skills` in every directory from CWD **up to** the repository root.
- Symlinked skill folders are followed.
- If two skills share the same `name`, both appear in skill selectors (they are not merged).

### Skill Structure & SKILL.md Format

A skill is a **directory** with a `SKILL.md` file plus optional supporting files:

```
my-skill/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── agents/
    └── openai.yaml   # Optional: UI metadata, invocation policy, tool dependencies
```

**`SKILL.md` format:**

```markdown
---
name: skill-name
description: Explain exactly when this skill should and should not trigger.
             Be precise: this description drives implicit invocation matching.
---

## Instructions

Skill instructions for Codex to follow. Write imperative steps with explicit
inputs and outputs.

1. First, read the current state of X.
2. Then, apply transformation Y using the provided parameters.
3. Output the result as Z.

## Notes

- Keep each skill focused on one job.
- Prefer instructions over scripts unless you need deterministic behavior.
```

**`agents/openai.yaml` — optional metadata:**

```yaml
interface:
  display_name: "Optional user-facing name"
  short_description: "Optional user-facing description"
  icon_small: "./assets/small-logo.svg"
  icon_large: "./assets/large-logo.png"
  brand_color: "#3B82F6"
  default_prompt: "Optional surrounding prompt to invoke the skill"

policy:
  # Set to false to disable implicit invocation; explicit $skill invocation still works
  allow_implicit_invocation: false

dependencies:
  tools:
    - type: "mcp"
      value: "openaiDeveloperDocs"
      description: "OpenAI Docs MCP server"
      transport: "streamable_http"
      url: "https://developers.openai.com/mcp"
```

### Invoking Skills

- **Explicit:** Include the skill in your prompt; in the CLI/IDE run `/skills` or type `$` to mention a skill by name (e.g., `$skill-name`).
- **Implicit:** Codex chooses a skill when your task matches the skill's `description`. Write descriptions with clear scope and boundaries.

### Built-in skill utilities

```sh
# Create a new skill interactively
$skill-creator

# Install curated skills from the community (e.g., $linear)
$skill-installer linear
```

### Enabling & Disabling Skills

```toml
# ~/.codex/config.toml

[[skills.config]]
path = "/path/to/skill/SKILL.md"
enabled = false
```

Restart Codex after changing `config.toml`.

---

## Subagents & Custom Agents

Codex can spawn specialized subagents in parallel and collect their results in one response. Subagent workflows are enabled by default and are available in the Codex app and CLI (IDE extension visibility coming soon).

> **Token cost:** Each subagent does its own model and tool work. Subagent workflows consume more tokens than comparable single-agent runs.

**Managing active agent threads in the CLI:**

```sh
# Switch between active agent threads and inspect ongoing threads
/agent
```

### Built-in Agents

| Name | Description |
|---|---|
| `default` | General-purpose fallback agent |
| `worker` | Execution-focused agent for implementation and fixes |
| `explorer` | Read-heavy codebase exploration agent |

> If a custom agent `name` matches a built-in agent name (e.g., `explorer`), your custom agent takes precedence.

### Custom Agent TOML Schema

Custom agents are defined as standalone `.toml` files:

- **User global:** `~/.codex/agents/*.toml`
- **Project:** `<repo>/.codex/agents/*.toml`

Each file defines **one** custom agent. Every file must define:

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Agent name used when spawning or referring to this agent (source of truth) |
| `description` | Yes | Human-facing guidance for when Codex should use this agent |
| `developer_instructions` | Yes | Core instructions that define the agent's behavior |
| `nickname_candidates` | No | Optional pool of display names for spawned agent instances |
| `model` | No | Override the model (inherits from parent session when omitted) |
| `model_reasoning_effort` | No | `"low"`, `"medium"`, or `"high"` |
| `sandbox_mode` | No | `"read-only"`, `"workspace-write"`, or `"danger-full-access"` |
| `mcp_servers` | No | MCP server configuration for this agent |
| `skills.config` | No | Skill enable/disable configuration |

> Matching the filename to the `name` field is the simplest convention, but `name` is the source of truth.

**Nickname candidates** assign readable display names to spawned instances (presentation-only; Codex still identifies the agent by `name`):

```toml
# .codex/agents/reviewer.toml
name = "reviewer"
description = "PR reviewer focused on correctness, security, and missing tests."
developer_instructions = """
Review code like an owner.
Prioritize correctness, security, behavior regressions, and missing test coverage.
Lead with concrete findings and include reproduction steps when possible.
"""
nickname_candidates = ["Atlas", "Delta", "Echo"]
```

### Global Subagent Settings

Set in `config.toml` under `[agents]`:

| Key | Type | Default | Description |
|---|---|---|---|
| `agents.max_threads` | number | `6` | Concurrent open agent thread cap |
| `agents.max_depth` | number | `1` | Spawned agent nesting depth (root session = 0). Default allows one level of child agents. Keep the default unless you specifically need recursive delegation. |
| `agents.job_max_runtime_seconds` | number | `1800` | Default per-worker timeout for `spawn_agents_on_csv` batch jobs |

### Example Custom Agents

#### PR Review pattern (3 specialized agents)

**`.codex/config.toml`:**

```toml
[agents]
max_threads = 6
max_depth = 1
```

**`.codex/agents/pr-explorer.toml`:**

```toml
name = "pr_explorer"
description = "Read-only codebase explorer for gathering evidence before changes are proposed."
model = "gpt-5.3-codex-spark"
model_reasoning_effort = "medium"
sandbox_mode = "read-only"
developer_instructions = """
Stay in exploration mode.
Trace the real execution path, cite files and symbols, and avoid proposing fixes unless the parent agent asks for them.
Prefer fast search and targeted file reads over broad scans.
"""
```

**`.codex/agents/reviewer.toml`:**

```toml
name = "reviewer"
description = "PR reviewer focused on correctness, security, and missing tests."
model = "gpt-5.4"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
developer_instructions = """
Review code like an owner.
Prioritize correctness, security, behavior regressions, and missing test coverage.
Lead with concrete findings, include reproduction steps when possible, and avoid style-only comments unless they hide a real bug.
"""
```

**`.codex/agents/docs-researcher.toml`:**

```toml
name = "docs_researcher"
description = "Documentation specialist that uses the docs MCP server to verify APIs and framework behavior."
model = "gpt-5.4-mini"
model_reasoning_effort = "medium"
sandbox_mode = "read-only"
developer_instructions = """
Use the docs MCP server to confirm APIs, options, and version-specific behavior.
Return concise answers with links or exact references when available.
Do not make code changes.
"""

[mcp_servers.openaiDeveloperDocs]
url = "https://developers.openai.com/mcp"
```

**Prompt to use this pattern:**

```
Review this branch against main. Have pr_explorer map the affected code paths,
reviewer find real risks, and docs_researcher verify the framework APIs that
the patch relies on.
```

### CSV Batch Processing (experimental)

Use `spawn_agents_on_csv` to process many similar tasks in parallel — one subagent per row:

```
Create /tmp/components.csv with columns path,owner and one row per frontend component.

Then call spawn_agents_on_csv with:
- csv_path: /tmp/components.csv
- id_column: path
- instruction: "Review {path} owned by {owner}. Return JSON with keys path, risk,
  summary, and follow_up via report_agent_job_result."
- output_csv_path: /tmp/components-review.csv
- output_schema: an object with required string fields path, risk, summary, and follow_up
```

Each worker must call `report_agent_job_result` exactly once. The exported CSV includes original row data plus metadata: `job_id`, `item_id`, `status`, `last_error`, and `result_json`.

---

## Hooks

Hooks are an extensibility framework that lets you inject deterministic scripts into the Codex agentic loop. Use cases include:

- Custom logging and analytics
- Scanning prompts to block accidental API key leaks
- Auto-summarizing conversations to create persistent memory
- Enforcing coding standards when a turn stops
- Context injection based on current directory

### Feature Flag & Platform Notes

> **Hooks are currently disabled on Windows.**

Hooks require a feature flag in `~/.codex/config.toml`:

```toml
[features]
codex_hooks = true
```

Runtime behavior:
- Matching hooks from **multiple files all run** (higher-precedence config layers don't replace lower-precedence hooks).
- Multiple matching hooks for the same event **run concurrently** — one hook cannot prevent another matching hook from starting.
- `PreToolUse`, `PermissionRequest`, `PostToolUse`, `UserPromptSubmit`, and `Stop` run at **turn scope**.

### Hook File Locations

Codex discovers `hooks.json` alongside active config layers. The two most common locations:

| Location | Scope |
|---|---|
| `~/.codex/hooks.json` | User global |
| `<repo>/.codex/hooks.json` | Project |

### Config Shape

A `hooks.json` file is organized into three levels:
1. A **hook event** (e.g., `PreToolUse`, `Stop`)
2. A **matcher group** that decides when the event matches
3. One or more **hook handlers** that run when the matcher group matches

Only `"command"` type hooks are currently supported.

### Matcher Patterns

The `matcher` field is a **regex string** applied to either the tool name or start source depending on the event. Use `"*"`, `""`, or omit `matcher` to match every occurrence.

| Event | Matcher applied to | Current values |
|---|---|---|
| `PreToolUse` | Tool name | Currently only `Bash` is emitted |
| `PermissionRequest` | Tool name | Currently only `Bash` is emitted |
| `PostToolUse` | Tool name | Currently only `Bash` is emitted |
| `SessionStart` | Start source | `startup` or `resume` |
| `UserPromptSubmit` | Not supported | Any configured matcher is ignored |
| `Stop` | Not supported | Any configured matcher is ignored |

Examples: `"Bash"`, `"startup|resume"`, `"Edit|Write"` (valid regex but won't match today)

### Common Input Fields

Every command hook receives a JSON object on **stdin**:

| Field | Type | Description |
|---|---|---|
| `session_id` | string | Current session or thread ID |
| `transcript_path` | string \| null | Path to session transcript file, if any |
| `cwd` | string | Working directory for the session |
| `hook_event_name` | string | Current hook event name |
| `model` | string | Active model slug |
| `turn_id` | string | Active Codex turn ID (turn-scoped hooks only) |

### Common Output Fields

`SessionStart`, `UserPromptSubmit`, and `Stop` support:

```json
{
  "continue": true,
  "stopReason": "optional reason string",
  "systemMessage": "surfaced as a warning in the UI",
  "suppressOutput": false
}
```

| Field | Effect |
|---|---|
| `continue: false` | Marks that hook run as stopped |
| `stopReason` | Recorded as the reason for stopping |
| `systemMessage` | Surfaced as a warning in the UI or event stream |
| `suppressOutput` | Parsed but not yet implemented |

Exit `0` with no output = success, Codex continues.

**Blocking with exit code 2:** Any hook can use exit code `2` and write the reason to `stderr` to block/provide feedback — an alternative to JSON output.

### Events Reference

#### `SessionStart`

Fires when a session starts or resumes. `matcher` is applied to `source`.

Additional input fields:

| Field | Type | Description |
|---|---|---|
| `source` | string | `startup` or `resume` |

Plain text on `stdout` is added as extra developer context.

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Load the workspace conventions before editing."
  }
}
```

---

#### `PreToolUse`

> **Work in progress.** Currently only intercepts `Bash` tool calls (not MCP, Write, WebSearch, or other tool calls).

`matcher` is applied to `tool_name` (currently always `Bash`).

Additional input fields:

| Field | Type | Description |
|---|---|---|
| `turn_id` | string | Active Codex turn ID |
| `tool_name` | string | Currently always `Bash` |
| `tool_use_id` | string | Tool-call ID for this invocation |
| `tool_input.command` | string | Shell command Codex is about to run |

To **block** a Bash command, return JSON:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Destructive command blocked by hook."
  }
}
```

Or use the legacy block shape:

```json
{
  "decision": "block",
  "reason": "Destructive command blocked by hook."
}
```

---

#### `PermissionRequest`

Fires when Codex is about to ask the user for approval. Can allow, deny, or defer to normal approval flow.

`matcher` is applied to `tool_name` (currently always `Bash`).

Additional input fields:

| Field | Type | Description |
|---|---|---|
| `turn_id` | string | Active Codex turn ID |
| `tool_name` | string | Currently always `Bash` |
| `tool_input.command` | string | Shell command associated with the approval request |
| `tool_input.description` | string \| null | Human-readable approval reason |

To **approve:**

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": { "behavior": "allow" }
  }
}
```

To **deny:**

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "deny",
      "message": "Blocked by repository policy."
    }
  }
}
```

If multiple matching hooks return decisions, any `deny` wins. An `allow` lets the request proceed without surfacing the approval prompt. If no matching hook decides, Codex uses normal approval flow.

---

#### `PostToolUse`

> **Work in progress.** Currently only intercepts `Bash` tool results. Cannot undo side effects from the command that already ran.

`matcher` is applied to `tool_name` (currently always `Bash`).

Additional input fields:

| Field | Type | Description |
|---|---|---|
| `turn_id` | string | Active Codex turn ID |
| `tool_name` | string | Currently always `Bash` |
| `tool_use_id` | string | Tool-call ID for this invocation |
| `tool_input.command` | string | Shell command Codex just ran |
| `tool_response` | JSON value | Bash tool output payload |

To provide feedback (replaces the tool result, Codex continues from hook-provided message):

```json
{
  "decision": "block",
  "reason": "The Bash output needs review before continuing.",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "The command updated generated files."
  }
}
```

Use `continue: false` to stop normal processing of the original tool result after the command has run.

---

#### `UserPromptSubmit`

Fires when the user submits a prompt. `matcher` is not used for this event.

Additional input fields:

| Field | Type | Description |
|---|---|---|
| `turn_id` | string | Active Codex turn ID |
| `prompt` | string | User prompt about to be sent |

To add extra context, return plain text on `stdout` or:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "Ask for a clearer reproduction before editing files."
  }
}
```

To **block** the prompt:

```json
{
  "decision": "block",
  "reason": "Ask for confirmation before doing that."
}
```

---

#### `Stop`

Fires when a conversation turn stops. `matcher` is not used for this event.

Additional input fields:

| Field | Type | Description |
|---|---|---|
| `turn_id` | string | Active Codex turn ID |
| `stop_hook_active` | boolean | Whether this turn was already continued by Stop |
| `last_assistant_message` | string \| null | Latest assistant message text |

`Stop` expects **JSON on stdout** when it exits `0` (plain text is invalid for this event).

To keep Codex running (triggers a new continuation prompt using `reason` as the prompt text):

```json
{
  "decision": "block",
  "reason": "Run one more pass over the failing tests."
}
```

If any matching `Stop` hook returns `continue: false`, that takes precedence over continuation decisions from other matching hooks.

---

### Complete Example hooks.json

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.codex/hooks/session_start.py",
            "statusMessage": "Loading session notes",
            "timeout": 10
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/pre_tool_use_policy.py\"",
            "statusMessage": "Checking Bash command",
            "timeout": 30
          }
        ]
      }
    ],
    "PermissionRequest": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/permission_request.py\"",
            "statusMessage": "Checking approval request",
            "timeout": 30
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/post_tool_use_review.py\"",
            "statusMessage": "Reviewing Bash output",
            "timeout": 60
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/user_prompt_submit_data_flywheel.py\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/stop_continue.py\"",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

> **Path tip:** For repo-local hooks, prefer resolving from the git root (e.g., `$(git rev-parse --show-toplevel)/.codex/hooks/...`) rather than a relative path. Codex may be started from a subdirectory and a git-root-based path keeps hook location stable.

Hook handler fields:

| Field | Default | Description |
|---|---|---|
| `type` | — | Currently only `"command"` |
| `command` | — | Shell command to run |
| `statusMessage` | (none) | Optional status shown in UI while hook runs |
| `timeout` / `timeoutSec` | `600` | Timeout in seconds |

---

## Non-interactive Mode (codex exec)

Use `codex exec` to run Codex from scripts and CI without opening the TUI:

```sh
# Basic usage
codex exec "summarize the repository structure and list the top 5 risky areas"

# Pipe output
codex exec "generate release notes for the last 10 commits" | tee release-notes.md

# Pipe input as context
npm test 2>&1 | codex exec "summarize the failing tests and propose the smallest fix"

# JSON Lines output for machine consumption
codex exec --json "triage open bug reports" | jq

# Full auto mode (allow edits)
codex exec --full-auto "fix the failing tests"

# Read-only sandbox (default)
codex exec "review this PR for security issues"

# Resume previous session
codex exec resume --last "fix the race conditions you found"

# Structured JSON output
codex exec "Extract project metadata" \
  --output-schema ./schema.json \
  -o ./project-metadata.json
```

**CI/CD authentication:**

```sh
export CODEX_API_KEY=<your-api-key>
codex exec --full-auto --sandbox workspace-write "fix the failing tests"
```

---

## Differences from Codex Web/Cloud

| Feature | Codex CLI | Codex Web/Cloud |
|---|---|---|
| Hooks | Supported (requires `codex_hooks = true` feature flag; **disabled on Windows**) | Not available |
| `.codex/rules/` | Supported | Not available |
| `codex exec` non-interactive mode | Supported | Not available |
| Subagents | Supported; visible in app and CLI | Available; IDE extension visibility coming soon |
| Skills | Supported (repo, user, admin, system scopes) | Supported |
| AGENTS.md | Supported (same discovery logic) | Supported (same discovery logic) |
| IDE Extension subagent visibility | Not available yet | Not available yet |
| `CODEX_HOME` env var | Supported (override home directory) | Not applicable |
| Binary installation | npm, Homebrew, direct binary | Browser / app download |

---

## Capabilities Summary Table

| Capability | File / Location | Purpose |
|---|---|---|
| Global instructions | `~/.codex/AGENTS.md` | Persistent defaults for all repos |
| Global override | `~/.codex/AGENTS.override.md` | Temporary global override without editing the base file |
| Repo instructions | `<repo>/AGENTS.md` | Project-level conventions and norms |
| Repo override | `<repo>/AGENTS.override.md` | Overrides repo-root `AGENTS.md` in that directory |
| Subdirectory instructions | `<subdir>/AGENTS.md` | Per-team or per-service rules |
| User configuration | `~/.codex/config.toml` | Fallback filenames, feature flags, agent settings |
| Shell command rules | `~/.codex/rules/*.rules` | Allow/block/prompt specific CLI commands |
| Project shell rules | `<repo>/.codex/rules/*.rules` | Project-scoped command rules |
| User hooks | `~/.codex/hooks.json` | Lifecycle scripts (global) |
| Project hooks | `<repo>/.codex/hooks.json` | Lifecycle scripts (per-repo) |
| Project skills | `<repo>/.agents/skills/*/SKILL.md` | Reusable task-specific workflows |
| User skills | `$HOME/.agents/skills/*/SKILL.md` | Personal skills across all repos |
| Admin skills | `/etc/codex/skills/*/SKILL.md` | Machine-wide skills |
| User custom agents | `~/.codex/agents/*.toml` | Personal custom agent definitions |
| Project custom agents | `<repo>/.codex/agents/*.toml` | Project-scoped custom agent definitions |
| AGENTS.md standard | ✅ native | `AGENTS.md` is the primary instruction filename; natively discovered at global, repo root, and nested levels without any configuration |
| agentskills.io standard | ✅ | `.agents/skills/<folder>/SKILL.md` follows the open agentskills.io standard; also supported at `$HOME/.agents/skills/` and `/etc/codex/skills/` |

---

## Sources

- [AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md)
- [Agent Skills](https://developers.openai.com/codex/skills)
- [Subagents](https://developers.openai.com/codex/subagents)
- [Hooks](https://developers.openai.com/codex/hooks)
- [Rules](https://developers.openai.com/codex/rules)
- [Non-interactive mode](https://developers.openai.com/codex/noninteractive)
- [Quickstart](https://developers.openai.com/codex/quickstart)
- [Agent Skills open standard](https://agentskills.io/)
- [Agent Skills specification](https://agentskills.io/specification)
- [openai/codex GitHub repository](https://github.com/openai/codex)
- [Hook schemas (generated)](https://github.com/openai/codex/tree/main/codex-rs/hooks/schema/generated)
