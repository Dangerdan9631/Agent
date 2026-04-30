# Codex Directive Files System

Comprehensive documentation for OpenAI Codex directive files, skills, subagents, and hooks.

---

## Overview

**OpenAI Codex** is a cloud-based AI coding agent available to ChatGPT Plus, Pro, Business, and Enterprise subscribers. It shares a directive file system with the **Codex CLI** (open-source, runs locally). Both use the same `AGENTS.md` instruction layering, skills, subagents, and hooks infrastructure described in this document.

Codex reads instruction files before doing any work, giving teams a consistent way to provide context, coding standards, and workflow guidance — no matter which repository is open.

---

## File Structure

```
~/.codex/
├── AGENTS.md                     # User global instructions
├── AGENTS.override.md            # User global override instructions (takes precedence)
├── config.toml                   # User configuration
├── hooks.json                    # User global hooks (feature flag required)
└── agents/                       # User global custom agents
    └── *.toml

<repo>/
├── AGENTS.md                     # Repo root instructions
├── AGENTS.override.md            # Repo root override (takes precedence over AGENTS.md)
└── .codex/
    ├── agents/                   # Project custom agents
    │   └── *.toml
    ├── rules/                    # Shell command execution rules (NOT instruction files)
    └── hooks.json                # Project hooks (feature flag required)

subdir/
└── AGENTS.md                     # Nested instructions (Codex walks root → CWD)

.agents/
└── skills/
    └── <skill-folder>/
        └── SKILL.md              # Project skills (scanned CWD up to repo root)

$HOME/.agents/skills/             # User global skills
/etc/codex/skills/                # Admin/system skills
```

> **Note:** The Codex home directory defaults to `~/.codex` but can be changed by setting the `CODEX_HOME` environment variable.

---

## AGENTS.md Discovery Order

Codex builds its instruction chain **once per run** (once per launched TUI session). Discovery follows this order:

### 1. Global Scope
- Reads `~/.codex/AGENTS.override.md` if it exists and is non-empty.
- Otherwise reads `~/.codex/AGENTS.md`.
- **Only the first non-empty file at this level is used.**

### 2. Project Scope
- Starting at the project root (typically the Git root), Codex walks **down** to the current working directory.
- If no project root is found, only the current directory is checked.
- In each directory along the path, it checks in order:
  1. `AGENTS.override.md`
  2. `AGENTS.md`
  3. Any fallback names listed in `project_doc_fallback_filenames` (config)
- **At most one file per directory is included.**

### 3. Merge Order
- Files are concatenated **root-first**, joined with blank lines.
- Files closer to your current directory appear later and therefore **override** earlier guidance.
- Empty files are skipped.
- Codex stops adding files once the combined size reaches `project_doc_max_bytes` (default: **32 KiB**).

### Verifying Discovery

```bash
# See which instruction files are active and in what order
codex --ask-for-approval never "Summarize the current instructions."

# Check nested overrides
codex --cd subdir --ask-for-approval never "Show which instruction files are active."
```

---

## AGENTS.md Format

`AGENTS.md` files are plain Markdown. Use headings to organize sections.

```markdown
# AGENTS.md

## Working Agreements

- Always run `npm test` after modifying JavaScript files.
- Prefer `pnpm` when installing dependencies.
- Ask for confirmation before adding new production dependencies.

## Code Style

- Use TypeScript strict mode.
- Prefer `const` over `let`; avoid `var`.
- Export interfaces, not concrete classes, from library entry points.

## Testing

- Every new function must have at least one unit test.
- Run `npm run lint` before opening a pull request.
- Document public utilities in `docs/` when you change behavior.

## Repository Layout

- `src/` — application source
- `tests/` — unit and integration tests
- `docs/` — public API documentation
```

### Override Example

Use `AGENTS.override.md` in a subdirectory to replace (not append to) parent guidance for that subtree:

```markdown
# services/payments/AGENTS.override.md

## Payments Service Rules

- Use `make test-payments` instead of `npm test`.
- Never rotate API keys without notifying the security channel.
- All monetary values must use `Decimal`, never `float`.
```

---

## Custom Fallback Filenames

If your repository already uses a different instruction filename (e.g., `CLAUDE.md`, `TEAM_GUIDE.md`), configure Codex to recognize it via `project_doc_fallback_filenames` in `~/.codex/config.toml`.

```toml
# ~/.codex/config.toml

project_doc_fallback_filenames = ["CLAUDE.md", "TEAM_GUIDE.md", ".agents.md"]
project_doc_max_bytes = 65536
```

With this config, Codex checks each directory in this order:
1. `AGENTS.override.md`
2. `AGENTS.md`
3. `CLAUDE.md`
4. `TEAM_GUIDE.md`
5. `.agents.md`

Filenames **not** on this list are ignored for instruction discovery.

> **Tip:** Set `CODEX_HOME=$(pwd)/.codex` to use a project-local Codex profile for automation or CI.

---

## `.codex/rules/` — Shell Command Execution Rules

> **Important distinction:** `.codex/rules/` is for **shell command execution policy** (allow / block / prompt), not for instruction or context files.

Rules control which CLI commands Codex may run without prompting, which are always blocked, and which require interactive approval.

```
<repo>/.codex/rules/
├── allow.toml      # Commands always permitted
├── block.toml      # Commands always denied
└── prompt.toml     # Commands that require explicit user approval
```

Example `allow.toml`:

```toml
[[rules]]
description = "Read-only git operations"
pattern = "^git (status|log|diff|show|branch|remote -v)"

[[rules]]
description = "Package listing"
pattern = "^(npm|pnpm|yarn) (list|why|info)"
```

Example `block.toml`:

```toml
[[rules]]
description = "Prevent force pushes"
pattern = "^git push.*--force"

[[rules]]
description = "Prevent database drops"
pattern = "^(psql|mysql).*DROP (DATABASE|TABLE)"
```

---

## Skills

Skills extend Codex with task-specific capabilities, following the [Agent Skills open standard](https://agentskills.io/). A skill packages instructions, optional scripts, and references so Codex can reliably follow a workflow.

### How Codex Uses Skills

Codex uses **progressive disclosure** to keep context footprint small:

1. **Discovery:** At startup, only each skill's `name`, `description`, file path, and optional `openai.yaml` metadata are loaded.
2. **Activation:** When a task matches a skill's description (explicitly via `$skill-name` or `$`, or implicitly by Codex), the full `SKILL.md` instructions are loaded into context.
3. **Execution:** Codex follows the instructions, optionally running bundled scripts or loading referenced files.

### Skill Directory Structure

```
my-skill/
├── SKILL.md              # Required: metadata + instructions
├── scripts/              # Optional: executable code
├── references/           # Optional: documentation
├── assets/               # Optional: templates, resources
└── agents/
    └── openai.yaml       # Optional: UI appearance, policy, tool dependencies
```

### Where to Save Skills

| Scope | Location | Use Case |
|-------|----------|----------|
| **Repo (CWD)** | `.agents/skills/` in CWD | Skills relevant to the current working folder (e.g., a microservice) |
| **Repo (parent)** | `.agents/skills/` in parent directories up to repo root | Skills for a module or shared area |
| **Repo (root)** | `$REPO_ROOT/.agents/skills/` | Skills available to the entire repository |
| **User global** | `$HOME/.agents/skills/` | Personal skills that apply to any repository |
| **Admin/system** | `/etc/codex/skills/` | Machine-wide or container defaults |
| **System built-in** | Bundled with Codex | `skill-creator`, `plan`, and other broadly useful skills |

> Codex scans `.agents/skills` from CWD **up to** the repository root. Symlinked skill folders are followed. If two skills share the same `name`, both appear in skill selectors (no merging).

### Example SKILL.md

```markdown
---
name: api-review
description: Review REST API endpoint definitions for consistency, security, and documentation completeness. Use when adding or modifying API routes.
---

## API Review Checklist

1. Verify all endpoints have OpenAPI/Swagger annotations.
2. Check for authentication/authorization guards on every route.
3. Ensure request bodies are validated with a schema.
4. Confirm error responses use standard HTTP status codes.
5. Check that sensitive fields are not exposed in responses.
6. Verify rate limiting is applied where appropriate.

## Output

Produce a numbered list of findings. For each finding include:
- File and line number
- Severity: `critical`, `warning`, or `info`
- Description and suggested fix
```

### Optional `agents/openai.yaml` Metadata

```yaml
interface:
  display_name: "API Reviewer"
  short_description: "Reviews REST endpoints for consistency, security, and docs"
  icon_small: "./assets/small-logo.svg"
  icon_large: "./assets/large-logo.png"
  brand_color: "#3B82F6"
  default_prompt: "Review all API endpoints in this PR for security and documentation."

policy:
  allow_implicit_invocation: false  # Only triggers when explicitly invoked

dependencies:
  tools:
    - type: "mcp"
      value: "openaiDeveloperDocs"
      description: "OpenAI Docs MCP server"
      transport: "streamable_http"
      url: "https://developers.openai.com/mcp"
```

### Enabling / Disabling Skills

```toml
# ~/.codex/config.toml

[[skills.config]]
path = "/path/to/skill/SKILL.md"
enabled = false
```

Restart Codex after changing `config.toml`.

### Creating Skills

Use the built-in creator:

```
$skill-creator
```

Or install curated skills:

```
$skill-installer linear
```

---

## Subagents

Codex supports multi-agent workflows by spawning specialized subagents in parallel and collecting their results. Subagents are only spawned when **explicitly requested**.

> Each subagent does its own model and tool work, so subagent workflows consume more tokens than comparable single-agent runs.

### Built-in Agents

| Name | Purpose |
|------|---------|
| `default` | General-purpose fallback agent |
| `worker` | Execution-focused agent for implementation and fixes |
| `explorer` | Read-heavy codebase exploration agent |

### Custom Agents

Define custom agents as TOML files:
- **User global:** `~/.codex/agents/*.toml`
- **Project:** `.codex/agents/*.toml`

Each file defines **one** custom agent. If a custom agent `name` matches a built-in agent name, the custom agent takes precedence.

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Agent name Codex uses when spawning or referring to this agent |
| `description` | string | Human-facing guidance for when Codex should use this agent |
| `developer_instructions` | string | Core instructions defining the agent's behavior |

#### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `nickname_candidates` | string[] | Display name pool for spawned instances |
| `model` | string | Model to use (inherits from parent session if omitted) |
| `model_reasoning_effort` | string | `low`, `medium`, or `high` |
| `sandbox_mode` | string | `read-only`, `workspace-write`, etc. |
| `mcp_servers` | table | MCP server configuration |
| `skills.config` | array | Skills configuration |

#### Example: PR Reviewer Agent

```toml
# .codex/agents/reviewer.toml

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
nickname_candidates = ["Atlas", "Delta", "Echo"]
```

#### Example: Read-Only Explorer Agent

```toml
# .codex/agents/pr-explorer.toml

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

#### Example: Docs Researcher with MCP

```toml
# .codex/agents/docs-researcher.toml

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

### Global Subagent Settings

Configure in `.codex/config.toml` or `~/.codex/config.toml`:

```toml
[agents]
max_threads = 6           # Concurrent open agent thread cap (default: 6)
max_depth = 1             # Spawned agent nesting depth; root session = 0 (default: 1)
job_max_runtime_seconds = 1800  # Default per-worker timeout for CSV batch jobs
```

> **Warning:** Raising `max_depth` beyond 1 enables recursive agent delegation, which can dramatically increase token usage and latency.

### Managing Subagents

- Use `/agent` in the CLI to switch between active agent threads.
- Ask Codex directly to steer, stop, or close completed agent threads.
- In interactive CLI sessions, approval requests from inactive agent threads surface with the source thread label; press `o` to inspect before approving.

### CSV Batch Processing (Experimental)

Use `spawn_agents_on_csv` to process many similar tasks in parallel. Codex reads a CSV, spawns one worker subagent per row, waits for all to finish, and exports results.

```
Create /tmp/components.csv with columns path,owner and one row per frontend component.

Then call spawn_agents_on_csv with:
- csv_path: /tmp/components.csv
- id_column: path
- instruction: "Review {path} owned by {owner}. Return JSON with keys path, risk, summary,
  and follow_up via report_agent_job_result."
- output_csv_path: /tmp/components-review.csv
- output_schema: an object with required string fields path, risk, summary, and follow_up
```

Each worker must call `report_agent_job_result` exactly once.

---

## Hooks

Hooks are an extensibility framework that inject deterministic scripts into the Codex agentic loop.

> **Experimental.** Hooks are under active development. **Currently disabled on Windows.**

### Enabling Hooks

Add to `~/.codex/config.toml`:

```toml
[features]
codex_hooks = true
```

### Hook File Locations

Codex discovers `hooks.json` next to active config layers. The two most useful locations are:

- `~/.codex/hooks.json` — User global
- `<repo>/.codex/hooks.json` — Project

If multiple `hooks.json` files exist, **all matching hooks load**. Higher-precedence config layers do not replace lower-precedence hooks.

### Runtime Behavior

- Matching hooks from multiple files all run.
- Multiple matching command hooks for the same event are launched **concurrently** — one hook cannot prevent another matching hook from starting.
- `PreToolUse`, `PermissionRequest`, `PostToolUse`, `UserPromptSubmit`, and `Stop` run at **turn scope**.

### Supported Events

| Event | Matcher Target | Notes |
|-------|---------------|-------|
| `SessionStart` | Start source (`startup\|resume`) | Fires when a session starts or resumes |
| `PreToolUse` | Tool name | Currently only `Bash` is emitted |
| `PermissionRequest` | Tool name | Fires before Codex asks for approval; currently only `Bash` |
| `PostToolUse` | Tool name | Fires after a tool call completes; currently only `Bash` |
| `UserPromptSubmit` | Not supported (matcher ignored) | Fires when a user prompt is submitted |
| `Stop` | Not supported (matcher ignored) | Fires when a conversation turn stops |

### Matcher Patterns

The `matcher` field is a **regex string**. Use `"*"`, `""`, or omit `matcher` to match every occurrence:

```
"Bash"             → matches Bash tool
"startup|resume"   → matches both session start sources
"Edit|Write"       → valid regex, but won't match today (PreToolUse only emits Bash)
```

### Common Input Fields (all events)

Every hook receives a JSON object on `stdin` with at least:

| Field | Type | Description |
|-------|------|-------------|
| `session_id` | string | Current session or thread ID |
| `transcript_path` | string \| null | Path to session transcript file, if any |
| `cwd` | string | Working directory for the session |
| `hook_event_name` | string | Current hook event name |
| `model` | string | Active model slug |

Turn-scoped hooks also include `turn_id`.

### Complete `hooks.json` Example

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
            "timeout": 30
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
            "statusMessage": "Checking Bash command"
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
            "statusMessage": "Checking approval request"
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
            "statusMessage": "Reviewing Bash output"
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

> **Tip:** For repo-local hooks, resolve paths from the git root (`git rev-parse --show-toplevel`) rather than using relative paths. Codex may be started from a subdirectory, and git-root-based paths keep hook locations stable.

### Hook Event Details

#### `SessionStart`
- **Matcher:** Applied to `source` (`startup` or `resume`).
- **Extra input:** `source` (string)
- **stdout:** Plain text is added as extra developer context. JSON supports `additionalContext` and common output fields.

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Load the workspace conventions before editing."
  }
}
```

#### `PreToolUse`
- **Matcher:** Applied to `tool_name` (currently always `Bash`).
- **Extra input:** `turn_id`, `tool_name`, `tool_use_id`, `tool_input.command`
- **stdout:** Plain text is ignored. JSON can block the command:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Destructive command blocked by hook."
  }
}
```

Or use exit code `2` with the blocking reason on `stderr`.

#### `PermissionRequest`
- **Matcher:** Applied to `tool_name` (currently always `Bash`).
- **Extra input:** `turn_id`, `tool_name`, `tool_input.command`, `tool_input.description`
- **stdout:** Return `allow` or `deny` decisions:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": { "behavior": "allow" }
  }
}
```

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

If multiple hooks return decisions, any `deny` wins. If no hook decides, Codex uses normal approval flow.

#### `PostToolUse`
- **Matcher:** Applied to `tool_name` (currently always `Bash`).
- **Extra input:** `turn_id`, `tool_name`, `tool_use_id`, `tool_input.command`, `tool_response`
- **stdout:** JSON can provide feedback and additional context:

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

`decision: "block"` does not undo the completed command — it replaces the tool result with the feedback and continues.

#### `UserPromptSubmit`
- **Matcher:** Not used (ignored).
- **Extra input:** `turn_id`, `prompt`
- **stdout:** Plain text is added as developer context. JSON can block the prompt:

```json
{ "decision": "block", "reason": "Ask for confirmation before doing that." }
```

#### `Stop`
- **Matcher:** Not used (ignored).
- **Extra input:** `turn_id`, `stop_hook_active`, `last_assistant_message`
- **stdout:** Must be valid JSON (plain text is invalid). To keep Codex running:

```json
{ "decision": "block", "reason": "Run one more pass over the failing tests." }
```

`decision: "block"` creates a new continuation prompt using your `reason` text. If any matching `Stop` hook returns `continue: false`, that takes precedence over continuation decisions.

### Common Output Fields

```json
{
  "continue": true,
  "stopReason": "optional reason string",
  "systemMessage": "optional warning shown in UI",
  "suppressOutput": false
}
```

| Field | Description |
|-------|-------------|
| `continue` | If `false`, marks that hook run as stopped |
| `stopReason` | Recorded as the reason for stopping |
| `systemMessage` | Surfaced as a warning in the UI or event stream |
| `suppressOutput` | Parsed but not yet implemented |

> **Defaults:** `timeout` defaults to `600` seconds if omitted. `timeoutSec` is accepted as an alias.

---

## Capabilities Summary

| Feature | Location | Notes |
|---------|----------|-------|
| Global instructions | `~/.codex/AGENTS.md` | Applies to all sessions |
| Global override | `~/.codex/AGENTS.override.md` | Temporary global override |
| Repo instructions | `<repo>/AGENTS.md` | Repo-level guidance |
| Nested instructions | `<subdir>/AGENTS.md` | Overrides ancestor guidance |
| Fallback filenames | `~/.codex/config.toml` → `project_doc_fallback_filenames` | Treat `CLAUDE.md` etc. as instructions |
| Shell rules | `<repo>/.codex/rules/` | Allow/block/prompt CLI commands |
| Project skills | `<repo>/.agents/skills/` | Task-specific workflows (open standard) |
| User global skills | `$HOME/.agents/skills/` | Personal skills across all repos |
| Admin skills | `/etc/codex/skills/` | System/container-wide skills |
| Project custom agents | `<repo>/.codex/agents/*.toml` | TOML-defined subagents |
| User global custom agents | `~/.codex/agents/*.toml` | Personal custom agents |
| Project hooks | `<repo>/.codex/hooks.json` | Lifecycle scripts (feature flag required) |
| User global hooks | `~/.codex/hooks.json` | Personal lifecycle scripts (feature flag required) |
| CSV batch jobs | `spawn_agents_on_csv` tool | Experimental parallel processing |
| AGENTS.md standard | ✅ native | `AGENTS.md` is the primary instruction filename; natively discovered at global, repo root, and nested levels without any configuration |
| agentskills.io standard | ✅ | `.agents/skills/<folder>/SKILL.md` follows the open agentskills.io standard; also supported at `$HOME/.agents/skills/` and `/etc/codex/skills/` |

---

## Sources

- [AGENTS.md Guide](https://developers.openai.com/codex/guides/agents-md) — Official guide to custom instructions
- [Agent Skills](https://developers.openai.com/codex/skills) — Skills documentation
- [Subagents](https://developers.openai.com/codex/subagents) — Subagent and custom agent documentation
- [Hooks](https://developers.openai.com/codex/hooks) — Hooks extensibility framework
- [Rules](https://developers.openai.com/codex/rules) — Shell command execution rules
- [agentskills.io](https://agentskills.io/) — Open Agent Skills standard
- [agentskills.io Specification](https://agentskills.io/specification) — Full specification
- [openai/skills on GitHub](https://github.com/openai/skills) — Curated skill examples
- [Hooks Schema](https://github.com/openai/codex/tree/main/codex-rs/hooks/schema/generated) — Full wire format schemas
