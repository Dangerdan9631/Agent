# Cursor IDE — Directive Files & Hooks System

**Cursor** is an AI-first code editor built on VS Code. It integrates LLM assistance directly into the editing workflow through context rules, hooks, and agent directives.

Official site: [https://cursor.com](https://cursor.com)

---

## File Structure

```
~/.cursor/
├── hooks.json              # User-global hooks
└── hooks/                  # User hook scripts
    ├── audit.sh
    └── format.sh

<project>/
├── .cursor/
│   ├── rules/
│   │   ├── always-apply.mdc        # alwaysApply rule
│   │   ├── ai-scoped.mdc           # AI-decided (description) rule
│   │   ├── glob-scoped.mdc         # File-pattern scoped rule
│   │   ├── manual-only.mdc         # @mention only rule
│   │   └── imported/               # Remote/imported rules
│   │       └── <repoName>/
│   │           └── *.mdc
│   └── hooks.json          # Project-scoped hooks
├── AGENTS.md               # Alternative root instructions (plain markdown)
└── ...

# Enterprise / MDM (system-wide):
# macOS:   /Library/Application Support/Cursor/hooks.json
# Linux:   /etc/cursor/hooks.json
# Windows: C:\ProgramData\Cursor\hooks.json
```

---

## Global (User) Rules

User Rules are **global preferences** defined in **Cursor Settings → Rules**. They apply across all projects and are used by Agent (Chat).

- Stored as plain text in the Cursor Settings UI — **not a file on disk**
- Ideal for personal coding style preferences or communication style
- Example:

```
Please reply in a concise style. Avoid unnecessary repetition or filler language.
Always use TypeScript strict mode. Prefer functional programming patterns.
```

**Precedence order (highest to lowest):** Team Rules → Project Rules → User Rules

---

## Project Rules (`.cursor/rules/`)

Project rules live in `.cursor/rules/` as markdown files and are **version-controlled**. They provide persistent, reusable context injected at the start of model context.

### File Extensions

- `.mdc` — Markdown with frontmatter (recommended for metadata control)
- `.md` — Plain markdown (simpler, no frontmatter metadata)

Rules can be organized in subdirectories (e.g., `.cursor/rules/frontend/components.mdc`).

### Frontmatter Types & Application Modes

| Mode | Frontmatter | Behavior |
|------|-------------|----------|
| **Always Apply** | `alwaysApply: true` | Included in every chat session |
| **Apply Intelligently** | `description: "..."` + `alwaysApply: false` | Agent decides whether to include based on description |
| **Apply to Specific Files** | `globs: "src/**/*.ts"` | Applied when matching files are in context |
| **Apply Manually** | *(no frontmatter or empty)* | Only included when explicitly @-mentioned in chat |

### Creating Rules

- **From chat:** Type `/create-rule` in Agent and describe what you want. Agent generates the rule file and saves it to `.cursor/rules/`.
- **From settings:** Open **Cursor Settings → Rules, Commands** and click `+ Add Rule`.

---

### Example Rule Files

#### Always Apply Rule

```mdc
---
alwaysApply: true
---

- Always use TypeScript with strict mode enabled
- Prefer `const` over `let`; never use `var`
- Use named exports over default exports
```

#### AI-Decided Rule (description-based)

```mdc
---
description: "Standards for React frontend components and prop validation"
alwaysApply: false
---

- Use functional components with hooks; avoid class components
- Define prop types with TypeScript interfaces, not `PropTypes`
- Co-locate component tests in `__tests__/` next to the component file
```

#### File-Pattern Scoped Rule

```mdc
---
globs: "src/**/*.ts,src/**/*.tsx"
alwaysApply: false
---

- All async functions must explicitly handle errors with try/catch
- Use the `Result<T, E>` pattern from `src/utils/result.ts` for fallible operations
- Import paths must use `@/` alias; no relative `../../` imports
```

#### Manual-Only Rule (no frontmatter)

```mdc
# Database Migration Checklist

Use this when generating a new migration:

1. Always add a `down` migration that reverses the `up` migration exactly
2. Never drop columns in the same migration that removes the index
3. Add a comment block explaining the business reason for the schema change
```

---

### Importing Remote Rules

Rules can be imported from any GitHub repository (public or private):

1. Open **Cursor Settings → Rules, Commands**
2. Click `+ Add Rule` → **Remote Rule (Github)**
3. Paste the GitHub repository URL. Cursor scans for all `.mdc` files.
4. Rules are placed in `.cursor/rules/imported/<repoName>/` (relative paths preserved)

---

### Best Practices

- Keep rules **under 500 lines**; split large rules into composable smaller ones
- Provide **concrete examples** or reference files rather than copying code
- Avoid vague guidance — write rules like clear internal docs
- **Check rules into git** so the whole team benefits
- Add rules only when you notice Agent making the same mistake repeatedly

---

## AGENTS.md Support

`AGENTS.md` is a plain markdown file placed at the **project root** (or in subdirectories) as a simpler alternative to `.cursor/rules/`.

- No YAML frontmatter required
- Always applied when present (equivalent to `alwaysApply: true`)
- Cursor supports `AGENTS.md` at root **and nested subdirectories**
- Perfect for projects needing simple, readable instructions without structured rules

```markdown
# Project Instructions

## Code Style

- Use TypeScript for all new files
- Prefer functional components in React
- Use snake_case for database columns

## Architecture

- Follow the repository pattern
- Keep business logic in service layers
- Never import directly from `node_modules`; use the re-exports in `src/lib/`
```

---

## Team Rules (Team & Enterprise Plans)

Team Rules are managed from the **Cursor dashboard** and automatically distributed to all team members.

- Configured at [cursor.com/dashboard/team-content](https://cursor.com/dashboard/team-content)
- Support glob patterns for file-scoped application (e.g., `**/*.py`)
- Free-form text — do **not** use `.cursor/rules/` folder structure
- **Precedence:** Team Rules take precedence over Project Rules and User Rules

### Activation & Enforcement

| Option | Behavior |
|--------|----------|
| **Enable immediately** | Rule is active as soon as created |
| **Draft** | Saved but not applied until manually enabled |
| **Enforce** | Required for all team members; cannot be disabled |
| **Non-enforced** | Team members can toggle off in Cursor Settings |

---

## Skills

Cursor supports agent skills following the [agentskills.io](https://agentskills.io) open standard (available since Cursor 2.4).

### Skill Directories

| Path | Scope |
|------|-------|
| `.agents/skills/<skill-name>/` | Project (primary) |
| `.cursor/skills/<skill-name>/` | Project |
| `.claude/skills/<skill-name>/` | Project (cross-tool compat) |
| `.codex/skills/<skill-name>/` | Project (cross-tool compat) |
| `~/.agents/skills/<skill-name>/` | User global |
| `~/.cursor/skills/<skill-name>/` | User global |
| `~/.claude/skills/<skill-name>/` | User global (cross-tool compat) |
| `~/.codex/skills/<skill-name>/` | User global (cross-tool compat) |

Each skill is a directory containing a `SKILL.md` file. Cursor automatically discovers and presents available skills to the agent at startup; the agent decides relevance based on context. Skills can also be explicitly invoked with `/skill-name` in Agent chat.

### `SKILL.md` Frontmatter

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Skill identifier; lowercase, hyphens only; must match directory name |
| `description` | Yes | What the skill does and when to use it; drives automatic invocation |
| `license` | No | License name or reference |
| `compatibility` | No | Environment requirements |
| `metadata` | No | Arbitrary key-value metadata |
| `disable-model-invocation` | No | When `true`, skill only included via explicit `/skill-name` invocation |

### Optional Skill Directories

| Directory | Purpose |
|-----------|---------|
| `scripts/` | Executable code the agent can run |
| `references/` | Additional documentation loaded on demand |
| `assets/` | Static resources (templates, config files, etc.) |

### Migration

The built-in `/migrate-to-skills` skill (Cursor 2.4+) converts existing dynamic rules and slash commands to skills. Rules with `alwaysApply: true` or `globs:` patterns are not migrated.

- **Sources**: [cursor.com/docs/skills](https://cursor.com/docs/skills)

## Subagents

Cursor has no native subagent file system. For structured subagent control, use [Hooks](#hooks) (`subagentStart` / `subagentStop` events).

---

## Hooks

Hooks let you observe, control, and extend the Cursor agent loop using custom scripts or LLM-evaluated conditions. They are spawned processes communicating over **stdio** using JSON.

### Use Cases

- Run formatters after file edits
- Add analytics and audit trails
- Scan for PII or secrets
- Gate risky operations (e.g., SQL writes, network calls)
- Control subagent (Task tool) execution
- Inject environment variables or context at session start

---

### Hook File Locations

| Scope | Path |
|-------|------|
| **User (global)** | `~/.cursor/hooks.json` |
| **Project** | `<project-root>/.cursor/hooks.json` |
| **Enterprise (macOS)** | `/Library/Application Support/Cursor/hooks.json` |
| **Enterprise (Linux/WSL)** | `/etc/cursor/hooks.json` |
| **Enterprise (Windows)** | `C:\ProgramData\Cursor\hooks.json` |
| **Team (Enterprise cloud)** | Cursor dashboard → synced automatically |

**Priority order (highest to lowest):** Enterprise → Team → Project → User

All matching hooks from every source run; when responses conflict, higher-priority sources take precedence.

---

### Working Directories

| Hook Source | Working Directory |
|-------------|-------------------|
| Project hooks (`.cursor/hooks.json`) | Project root |
| User hooks (`~/.cursor/hooks.json`) | `~/.cursor/` |
| Enterprise hooks | Enterprise config directory |
| Team hooks | Managed hooks directory |

For project hooks, use paths like `.cursor/hooks/script.sh` (relative to project root).  
For user hooks, use `./hooks/script.sh` or `hooks/script.sh` (relative to `~/.cursor/`).

---

### Hook Types

#### Command Hooks (default)

Execute shell scripts that receive JSON input via stdin and return JSON output via stdout.

```json
{
  "hooks": {
    "beforeShellExecution": [
      {
        "command": ".cursor/hooks/approve-network.sh",
        "timeout": 30,
        "matcher": "curl|wget|nc"
      }
    ]
  }
}
```

**Exit code behavior:**

| Exit Code | Behavior |
|-----------|----------|
| `0` | Hook succeeded; use JSON output |
| `2` | Block the action (equivalent to `permission: "deny"`) — matches Claude Code behavior |
| Other | Hook failed; action proceeds (fail-open by default) |

Set `failClosed: true` on the hook definition to block the action on any failure (crash, timeout, invalid JSON) instead of allowing it through.

#### Prompt Hooks (LLM-evaluated)

Use an LLM to evaluate a natural-language condition. Useful for policy enforcement without custom scripts.

```json
{
  "hooks": {
    "beforeShellExecution": [
      {
        "type": "prompt",
        "prompt": "Does this command look safe to execute? Only allow read-only operations.",
        "timeout": 10
      }
    ]
  }
}
```

- Returns `{ ok: boolean, reason?: string }`
- Uses a fast model for quick evaluation
- `$ARGUMENTS` placeholder is auto-replaced with hook input JSON
- Optional `model` field to override the default LLM model

---

### Hook Events

#### Agent Events

| Event | Trigger | Can Block? |
|-------|---------|-----------|
| `sessionStart` | New composer conversation created | No (fire-and-forget) |
| `sessionEnd` | Composer conversation ends | No (fire-and-forget) |
| `preToolUse` | Before any tool execution | Yes |
| `postToolUse` | After successful tool execution | No |
| `postToolUseFailure` | When a tool fails, times out, or is denied | No |
| `subagentStart` | Before spawning a subagent (Task tool) | Yes |
| `subagentStop` | When a subagent completes/errors/aborts | No (can inject follow-up) |
| `beforeShellExecution` | Before any shell command | Yes |
| `afterShellExecution` | After shell command executes | No |
| `beforeMCPExecution` | Before any MCP tool execution | Yes |
| `afterMCPExecution` | After MCP tool executes | No |
| `beforeReadFile` | Before Agent reads a file | Yes |
| `afterFileEdit` | After Agent edits a file | No |
| `beforeSubmitPrompt` | Right after user sends prompt, before backend | Yes |
| `preCompact` | Before context window compaction | No (observational) |
| `stop` | When the agent loop ends | No (can inject follow-up) |
| `afterAgentResponse` | After agent completes an assistant message | No |
| `afterAgentThought` | After agent completes a thinking block | No |

#### Tab / Inline Completion Events

| Event | Trigger | Can Block? |
|-------|---------|-----------|
| `beforeTabFileRead` | Before Tab reads a file | Yes |
| `afterTabFileEdit` | After Tab edits a file | No |

---

### Per-Hook Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `command` | string | required | Script path or shell command |
| `type` | `"command"` \| `"prompt"` | `"command"` | Hook execution type |
| `timeout` | number | platform default | Execution timeout in seconds |
| `loop_limit` | number \| null | `5` | Max auto follow-ups for `stop`/`subagentStop`. `null` = no limit |
| `failClosed` | boolean | `false` | When `true`, hook failures block the action |
| `matcher` | string | — | Regex/string filter for when the hook fires |

### Matcher Support by Event

| Event | Matcher Applies To |
|-------|--------------------|
| `preToolUse` / `postToolUse` / `postToolUseFailure` | Tool type (`Shell`, `Read`, `Write`, `Grep`, `Delete`, `Task`, `MCP:<tool_name>`) |
| `subagentStart` / `subagentStop` | Subagent type (`generalPurpose`, `explore`, `shell`, etc.) |
| `beforeShellExecution` / `afterShellExecution` | Full shell command string |
| `beforeReadFile` | Tool type (`TabRead`, `Read`, etc.) |
| `afterFileEdit` | Tool type (`TabWrite`, `Write`, etc.) |
| `beforeSubmitPrompt` | Value `UserPromptSubmit` |
| `stop` | Value `Stop` |
| `afterAgentResponse` | Value `AgentResponse` |
| `afterAgentThought` | Value `AgentThought` |

---

### Complete `hooks.json` Example

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "command": ".cursor/hooks/session-init.sh"
      }
    ],
    "sessionEnd": [
      {
        "command": ".cursor/hooks/audit.sh"
      }
    ],
    "preToolUse": [
      {
        "command": ".cursor/hooks/validate-tool.sh",
        "matcher": "Shell|Read|Write"
      }
    ],
    "postToolUse": [
      {
        "command": ".cursor/hooks/audit-tool.sh"
      }
    ],
    "postToolUseFailure": [
      {
        "command": ".cursor/hooks/log-failure.sh"
      }
    ],
    "subagentStart": [
      {
        "command": ".cursor/hooks/validate-subagent.sh",
        "matcher": "explore|shell"
      }
    ],
    "subagentStop": [
      {
        "command": ".cursor/hooks/audit-subagent.sh",
        "loop_limit": 3
      }
    ],
    "beforeShellExecution": [
      {
        "command": ".cursor/hooks/approve-network.sh",
        "matcher": "curl|wget|nc ",
        "timeout": 30,
        "failClosed": true
      },
      {
        "type": "prompt",
        "prompt": "Does this shell command look safe? Only allow read-only file operations and standard build commands.",
        "timeout": 10
      }
    ],
    "afterShellExecution": [
      {
        "command": ".cursor/hooks/audit.sh"
      }
    ],
    "beforeMCPExecution": [
      {
        "command": ".cursor/hooks/audit.sh",
        "failClosed": true
      }
    ],
    "afterMCPExecution": [
      {
        "command": ".cursor/hooks/audit.sh"
      }
    ],
    "beforeReadFile": [
      {
        "command": ".cursor/hooks/check-sensitive-files.sh",
        "failClosed": true
      }
    ],
    "afterFileEdit": [
      {
        "command": ".cursor/hooks/format.sh"
      }
    ],
    "beforeSubmitPrompt": [
      {
        "command": ".cursor/hooks/validate-prompt.sh"
      }
    ],
    "preCompact": [
      {
        "command": ".cursor/hooks/audit.sh"
      }
    ],
    "stop": [
      {
        "command": ".cursor/hooks/audit.sh",
        "loop_limit": 5
      }
    ],
    "afterAgentResponse": [
      {
        "command": ".cursor/hooks/log-response.sh"
      }
    ],
    "afterAgentThought": [
      {
        "command": ".cursor/hooks/log-thought.sh"
      }
    ],
    "beforeTabFileRead": [
      {
        "command": ".cursor/hooks/redact-secrets-tab.sh"
      }
    ],
    "afterTabFileEdit": [
      {
        "command": ".cursor/hooks/format-tab.sh"
      }
    ]
  }
}
```

---

### Hook Input / Output Reference

All hooks receive these common fields in addition to event-specific fields:

```json
{
  "conversation_id": "string",
  "generation_id": "string",
  "model": "string",
  "hook_event_name": "string",
  "cursor_version": "string",
  "workspace_roots": ["<path>"],
  "user_email": "string | null",
  "transcript_path": "string | null"
}
```

#### `sessionStart`

```json
// Input
{
  "session_id": "<unique session identifier>",
  "is_background_agent": true | false,
  "composer_mode": "agent" | "ask" | "edit"
}

// Output
{
  "env": { "<key>": "<value>" },
  "additional_context": "<context to inject into conversation>"
}
```

#### `preToolUse`

```json
// Input
{
  "tool_name": "Shell",
  "tool_input": { "command": "npm install", "working_directory": "/project" },
  "tool_use_id": "abc123",
  "cwd": "/project",
  "agent_message": "Installing dependencies..."
}

// Output
{
  "permission": "allow" | "deny",
  "user_message": "<shown to user when denied>",
  "agent_message": "<sent to agent when denied>",
  "updated_input": { "command": "npm ci" }
}
```

#### `beforeShellExecution` / `beforeMCPExecution`

```json
// beforeShellExecution input
{
  "command": "<full terminal command>",
  "cwd": "<current working directory>",
  "sandbox": false
}

// Output
{
  "permission": "allow" | "deny" | "ask",
  "user_message": "<message shown in client>",
  "agent_message": "<message sent to agent>"
}
```

#### `stop`

```json
// Input
{
  "status": "completed" | "aborted" | "error",
  "loop_count": 0
}

// Output
{
  "followup_message": "<auto-submit this as the next user message>"
}
```

#### `beforeSubmitPrompt`

```json
// Input
{
  "prompt": "<user prompt text>",
  "attachments": [
    { "type": "file" | "rule", "file_path": "<absolute path>" }
  ]
}

// Output
{
  "continue": true | false,
  "user_message": "<message shown to user when blocked>"
}
```

---

### Environment Variables Available to Hook Scripts

| Variable | Description | Available |
|----------|-------------|-----------|
| `CURSOR_PROJECT_DIR` | Workspace root directory | Always |
| `CURSOR_VERSION` | Cursor version string | Always |
| `CURSOR_USER_EMAIL` | Authenticated user email | If logged in |
| `CURSOR_TRANSCRIPT_PATH` | Path to conversation transcript | If transcripts enabled |
| `CURSOR_CODE_REMOTE` | `"true"` in remote workspaces | Remote only |
| `CLAUDE_PROJECT_DIR` | Alias for project dir (Claude Code compat.) | Always |

Session-scoped env vars from `sessionStart` hook output are passed to all subsequent hook executions within that session.

---

### Team Distribution of Hooks

| Method | How | Scope |
|--------|-----|-------|
| **Version control** | Commit `.cursor/hooks.json` to the repo | All team members in trusted workspaces |
| **MDM** | Deploy `hooks.json` to system-wide paths | Organization-wide, per machine |
| **Enterprise cloud** | Configure in Cursor dashboard | Auto-synced to all team members every 30 min |

Cloud agents (background agents) also load project hooks. On Enterprise plans, they also run team and enterprise-managed hooks.

---

### Claude Code Compatibility

Cursor hooks are **compatible with the Claude Code hooks format**. Exit code `2` blocking behavior matches Claude Code for cross-tool compatibility. See [Third Party Hooks](https://cursor.com/docs/reference/third-party-hooks) for details.

---

### Troubleshooting Hooks

- Use the **Hooks tab** in Cursor Settings to view configured and executed hooks
- Check the **Hooks output channel** in Cursor for error messages
- Cursor watches `hooks.json` files and **reloads on save** — restart Cursor if hooks still don't load
- Ensure scripts are **executable** (`chmod +x` on macOS/Linux)
- Verify relative paths match the hook source's working directory

---

## Capabilities Summary

| Feature | Supported | Mechanism |
|---------|-----------|-----------|
| Global instructions | Yes | Cursor Settings → Rules (UI, not a file) |
| Project rules | Yes | `.cursor/rules/*.mdc` or `.md` |
| Always-applied rules | Yes | `alwaysApply: true` frontmatter |
| AI-decided rules | Yes | `description:` frontmatter, no `alwaysApply` |
| File-pattern rules | Yes | `globs:` frontmatter |
| Manual rules | Yes | No frontmatter; @mention only |
| Team/org rules | Yes (Team/Enterprise) | Cursor dashboard |
| Enforced team rules | Yes (Team/Enterprise) | Dashboard toggle |
| Remote rule import | Yes | Settings → Add Rule → Remote Rule (Github) |
| `AGENTS.md` support | Yes | Root and subdirectories |
| Skills / subagents | No native support | Community convention; manual @mention only |
| Hooks (shell) | Yes | `hooks.json` command hooks |
| Hooks (LLM-evaluated) | Yes | `hooks.json` prompt hooks |
| Hook distribution | Yes | Version control, MDM, or Enterprise cloud |
| Claude Code hook compat | Yes | Exit code `2` blocking |
| `AGENTS.md` standard | ✅ root+nested | Root and nested `AGENTS.md` loaded natively; same as `.cursor/rules/` |
| `agentskills.io` standard | ❌ | No native skills system; community convention only |

---

## Sources

- [Cursor Rules Documentation](https://cursor.com/docs/context/rules)
- [Cursor Hooks Documentation](https://cursor.com/docs/hooks)
- [Cursor Third Party Hooks](https://cursor.com/docs/reference/third-party-hooks)
- [Cursor Enterprise](https://cursor.com/docs/enterprise)
- [Cursor Team Dashboard](https://cursor.com/dashboard/team-content)
- [Hooks for Security & Platform Teams (blog)](https://cursor.com/blog/hooks-partners)
