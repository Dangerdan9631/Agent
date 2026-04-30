# Claude Code — Directive Files System

Comprehensive reference for Claude Code's instruction, settings, hooks, and subagent system.

**CLI:** `claude`  
**Docs:** [code.claude.com/docs](https://code.claude.com/docs/en/overview)

---

## Overview

Claude Code is Anthropic's agentic coding CLI. Each session starts with a fresh context window. Two mechanisms carry knowledge across sessions:

- **CLAUDE.md files** — instructions you write to give Claude persistent context
- **Auto memory** — notes Claude writes itself based on your corrections and preferences

Settings, hooks, and subagents are configured through a layered file hierarchy covering managed/enterprise policy, user global, project, and local scopes.

---

## File Structure

```
# macOS managed policy
/Library/Application Support/ClaudeCode/CLAUDE.md
/Library/Application Support/ClaudeCode/managed-settings.json

# Linux / WSL managed policy
/etc/claude-code/CLAUDE.md
/etc/claude-code/managed-settings.json

# Windows managed policy
C:\Program Files\ClaudeCode\CLAUDE.md
C:\Program Files\ClaudeCode\managed-settings.json

# User global (~/.claude/)
~/.claude/
├── CLAUDE.md                    # User global instructions
├── CLAUDE.local.md              # (rarely used at user scope)
├── settings.json                # User global hooks & settings
├── rules/                       # User global pathed/globbed rules
│   └── *.md
└── agents/                      # User global subagents/skills
    └── *.md

# Project (<project>/)
<project>/
├── CLAUDE.md                    # Project root instructions (alternative: .claude/CLAUDE.md)
├── CLAUDE.local.md              # Project local instructions (gitignored)
└── .claude/
    ├── CLAUDE.md                # Project instructions (alternative to root CLAUDE.md)
    ├── settings.json            # Project hooks & settings (committed)
    ├── settings.local.json      # Project local hooks (gitignored)
    ├── rules/
    │   └── *.md                 # Pathed/globbed rules (optional YAML frontmatter)
    └── agents/
        └── *.md                 # Project subagents/skills
```

---

## Instruction Hierarchy

Precedence from **highest** to **lowest**:

| # | Scope | Location |
|---|-------|----------|
| 1 | **Managed/enterprise policy** | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS) · `/etc/claude-code/CLAUDE.md` (Linux) · `C:\Program Files\ClaudeCode\CLAUDE.md` (Windows) |
| 2 | **User global** | `~/.claude/CLAUDE.md` |
| 3 | **Project** | `./CLAUDE.md` or `./.claude/CLAUDE.md` |
| 4 | **Local (gitignored)** | `./CLAUDE.local.md` |

**Resolution:** Claude Code walks the directory tree **upward** from the current working directory to the home/filesystem root, loading every `CLAUDE.md` and `CLAUDE.local.md` found. All discovered files are concatenated into context — they do not override each other. Within each directory, `CLAUDE.local.md` is appended after `CLAUDE.md`. Subdirectory `CLAUDE.md` files are loaded **on demand** when Claude reads files in those directories.

> **Note:** Managed policy CLAUDE.md files cannot be excluded by any user or project setting.

---

## CLAUDE.md Format

Plain Markdown. Loaded into Claude's context window at session start.

**Tips for effective instructions:**
- Target **under 200 lines** per file — longer files reduce adherence
- Use Markdown headers and bullets to group related instructions
- Write concrete, verifiable rules ("Use 2-space indentation" not "Format code properly")
- Avoid contradictory instructions across files
- Use HTML block comments (`<!-- notes -->`) for maintainer notes — they are stripped before injection

**Example `CLAUDE.md`:**

```markdown
# Project Instructions

## Build & Test
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint` (run before every commit)

## Code Style
- Use 2-space indentation for all TypeScript files
- Prefer `const` over `let`; never use `var`
- All exported functions must have JSDoc comments

## Architecture
- API handlers live in `src/api/handlers/`
- Shared utilities go in `src/utils/`
- Do not import from `src/internal/` outside of `src/core/`

## Git Workflow
- Commit messages: `<type>(<scope>): <description>` (Conventional Commits)
- Never force-push to `main` or `develop`

## Sensitive Files
- Never read or modify `.env`, `.env.*`, or `secrets/`
```

---

## Pathed / Globbed Rules

Place Markdown files in `.claude/rules/` (or `~/.claude/rules/` for user-global rules). Each file should cover one topic.

- Files **without** `paths:` frontmatter are loaded at every session launch
- Files **with** `paths:` frontmatter load lazily when Claude reads files matching those globs
- Supports recursive subdirectories and symlinks

**YAML frontmatter format:**

```yaml
---
paths:
  - "src/api/**/*.ts"
  - "src/**/*.{ts,tsx}"
---
```

**Example: `src/api/**/*.ts`-scoped rule**

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules

- All endpoints must validate input with `zod` schemas
- Use the standard `ApiError` class for error responses
- Include OpenAPI JSDoc comments on every handler
- Return `{ data, meta }` envelope for paginated responses
```

**Supported glob patterns:**

| Pattern | Matches |
|---------|---------|
| `**/*.ts` | All TypeScript files in any directory |
| `src/**/*` | All files under `src/` |
| `*.md` | Markdown files in the project root |
| `src/**/*.{ts,tsx}` | TypeScript and TSX files under `src/` |

---

## `@file` Imports

Any `CLAUDE.md` can import additional files using `@path/to/file` syntax. Imported files are expanded and loaded into context at launch.

- Supports **relative** and **absolute** paths
- Relative paths resolve from the file containing the import
- Supports recursive imports up to **5 hops deep**
- Use `@AGENTS.md` to incorporate an existing `AGENTS.md` without duplication

**Example `CLAUDE.md` with imports:**

```markdown
# My Project

See @README.md for project overview.
Available commands: @package.json

@docs/architecture.md

# Git Workflow
@docs/git-instructions.md

# Individual Preferences
@~/.claude/my-project-preferences.md
```

**Incorporating an existing `AGENTS.md`:**

```markdown
@AGENTS.md

## Claude Code Specific

Use plan mode for all changes under `src/billing/`.
```

> **Note:** On first encounter of external imports in a project, Claude Code shows an approval dialog. If declined, imports remain disabled.

---

## Skills / Subagents

Custom AI subagents are Markdown files with YAML frontmatter stored in:

- **Project:** `.claude/agents/*.md`
- **User global:** `~/.claude/agents/*.md`

Invoked in chat with `>>agent-name` or the `/skill-name` slash command.

### Frontmatter Fields

| Field | Description |
|-------|-------------|
| `name` | Agent identifier (used in `>>name` invocation) |
| `description` | Short description shown in menus |
| `model` | Optional model override (e.g., `"haiku"`, `"sonnet"`) |
| `tools` | Optional list of tool names the agent may use |
| `isolation` | Optional: `"worktree"` to run in an isolated git worktree |
| `hooks` | Optional hooks scoped to this agent's lifecycle |

### Example Agent File

```markdown
---
name: security-reviewer
description: Reviews code changes for security vulnerabilities
model: claude-sonnet-4-6
tools:
  - Read
  - Grep
  - Glob
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/security-check.sh"
---

You are a security-focused code reviewer. When invoked, you:

1. Read the files specified or recently changed files
2. Check for OWASP Top 10 vulnerabilities
3. Look for hardcoded secrets, SQL injection risks, and XSS vectors
4. Report findings with file path, line number, severity, and remediation

Focus on: injection flaws, broken authentication, sensitive data exposure,
insecure deserialization, and use of components with known vulnerabilities.
```

---

## Hooks

Hooks are user-defined shell commands, HTTP endpoints, LLM prompts, or subagents that execute automatically at specific lifecycle points.

### Hook Scope Precedence

From **highest** to **lowest**:

| Scope | Location | Shared? |
|-------|----------|---------|
| Managed policy | `managed-settings.json` | Yes (IT-deployed) |
| Plugin | `hooks/hooks.json` (when plugin enabled) | Yes (bundled) |
| Project | `.claude/settings.json` | Yes (committed) |
| Local | `.claude/settings.local.json` | No (gitignored) |
| User | `~/.claude/settings.json` | No (machine-local) |
| Skill/subagent frontmatter | Component file | Yes (defined inline) |

### Hook Types

| Type | Description | Supports `async` |
|------|-------------|-----------------|
| `command` | Shell command; receives JSON on stdin; exit code and stdout control behavior | Yes |
| `http` | POST to an HTTP endpoint; same JSON input/output contract as command hooks | No |
| `prompt` | Single-turn LLM call returning `{ "ok": true/false, "reason": "..." }` | No |
| `agent` | Multi-turn subagent with tool access (Read, Grep, Glob) returning same schema | No |

> **PowerShell on Windows:** Add `"shell": "powershell"` to any command hook to run it via PowerShell. Claude Code auto-detects `pwsh.exe` (7+) with fallback to `powershell.exe` (5.1).

### Hook Events

| Event | When it fires | Can block? |
|-------|---------------|------------|
| `SessionStart` | Session begins or resumes | No (`command` only) |
| `InstructionsLoaded` | A CLAUDE.md or rules file is loaded into context | No |
| `UserPromptSubmit` | User submits a prompt, before Claude processes it | Yes |
| `UserPromptExpansion` | A slash command expands into a prompt | Yes |
| `PreToolUse` | Before a tool call executes | Yes |
| `PermissionRequest` | Permission dialog is about to appear | Yes |
| `PermissionDenied` | Auto-mode classifier denies a tool call | No (retry via JSON) |
| `PostToolUse` | After a tool call succeeds | No (feedback only) |
| `PostToolUseFailure` | After a tool call fails | No (feedback only) |
| `Notification` | Claude Code sends a notification | No |
| `SubagentStart` | A subagent is spawned | No |
| `SubagentStop` | A subagent finishes | Yes |
| `TaskCreated` | A task is created via TaskCreate | Yes |
| `TaskCompleted` | A task is marked completed | Yes |
| `Stop` | Claude finishes responding | Yes |
| `StopFailure` | Turn ends due to API error | No |
| `TeammateIdle` | Agent team teammate about to go idle | Yes |
| `ConfigChange` | A configuration file changes during session | Yes |
| `CwdChanged` | Working directory changes (e.g. `cd`) | No |
| `FileChanged` | A watched file changes on disk | No |
| `WorktreeCreate` | A worktree is being created | Yes (replaces git) |
| `WorktreeRemove` | A worktree is being removed | No |
| `PreCompact` | Before context compaction | Yes |
| `PostCompact` | After context compaction completes | No |
| `SessionEnd` | Session terminates | No |
| `Elicitation` | MCP server requests user input | Yes |
| `ElicitationResult` | User responds to MCP elicitation | Yes |

### Exit Code Behavior

| Exit Code | Meaning |
|-----------|---------|
| `0` | Success — stdout parsed for JSON output fields |
| `1` | Non-blocking error — Claude Code proceeds (despite Unix convention) |
| `2` | **Blocking error** — stderr text shown to Claude; blocks action where supported |

> **Exception:** `WorktreeCreate` treats any non-zero exit code as failure.

### JSON Output Fields (exit 0)

| Field | Default | Description |
|-------|---------|-------------|
| `continue` | `true` | If `false`, Claude stops entirely |
| `stopReason` | — | Message shown to user when `continue` is false |
| `suppressOutput` | `false` | Omit stdout from the debug log |
| `systemMessage` | — | Warning message shown to the user |
| `decision` | — | `"block"` with `reason` for events that support top-level blocking |
| `hookSpecificOutput` | — | Event-specific structured control (requires `hookEventName` field) |

### `settings.json` with Hooks — Complete Example

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(npm run lint)",
      "Bash(npm run test *)",
      "Bash(git diff *)",
      "Bash(git log *)"
    ],
    "deny": [
      "Bash(curl *)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)"
    ]
  },
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/on-session-start.sh"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Review this prompt for any requests that could compromise security or violate company policy: $ARGUMENTS. Respond with {\"ok\": true} to allow or {\"ok\": false, \"reason\": \"...\"}."
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
            "if": "Bash(rm *)",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/block-destructive.sh"
          }
        ]
      },
      {
        "matcher": "mcp__memory__.*",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Memory operation initiated' >> ~/mcp-operations.log"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/run-linter.sh",
            "async": true,
            "timeout": 120
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "You are evaluating whether Claude should stop working. Context: $ARGUMENTS\n\nAnalyze the conversation and determine if:\n1. All user-requested tasks are complete\n2. Any errors need to be addressed\n3. Follow-up work is needed\n\nRespond with JSON: {\"ok\": true} to allow stopping, or {\"ok\": false, \"reason\": \"your explanation\"} to continue working.",
            "timeout": 30
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "permission_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/notify-permission.sh"
          }
        ]
      },
      {
        "matcher": "idle_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/notify-idle.sh",
            "async": true
          }
        ]
      }
    ],
    "ConfigChange": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/audit-config-change.sh"
          }
        ]
      }
    ],
    "FileChanged": [
      {
        "matcher": ".envrc|.env",
        "hooks": [
          {
            "type": "command",
            "command": "direnv allow && direnv export bash"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/cleanup-session.sh",
            "timeout": 5
          }
        ]
      }
    ]
  },
  "env": {
    "NODE_ENV": "development"
  },
  "disableAllHooks": false
}
```

### Hook Event Type Support Matrix

| Event | `command` | `http` | `prompt` | `agent` |
|-------|:---------:|:------:|:--------:|:-------:|
| `SessionStart` | ✓ | — | — | — |
| `PreToolUse` | ✓ | ✓ | ✓ | ✓ |
| `PostToolUse` | ✓ | ✓ | ✓ | ✓ |
| `PostToolUseFailure` | ✓ | ✓ | ✓ | ✓ |
| `PermissionRequest` | ✓ | ✓ | ✓ | ✓ |
| `UserPromptSubmit` | ✓ | ✓ | ✓ | ✓ |
| `UserPromptExpansion` | ✓ | ✓ | ✓ | ✓ |
| `Stop` | ✓ | ✓ | ✓ | ✓ |
| `SubagentStop` | ✓ | ✓ | ✓ | ✓ |
| `TaskCreated` | ✓ | ✓ | ✓ | ✓ |
| `TaskCompleted` | ✓ | ✓ | ✓ | ✓ |
| `Notification` | ✓ | ✓ | — | — |
| `ConfigChange` | ✓ | ✓ | — | — |
| `CwdChanged` | ✓ | ✓ | — | — |
| `FileChanged` | ✓ | ✓ | — | — |
| `InstructionsLoaded` | ✓ | ✓ | — | — |
| `PermissionDenied` | ✓ | ✓ | — | — |
| `PreCompact` | ✓ | ✓ | — | — |
| `PostCompact` | ✓ | ✓ | — | — |
| `SessionEnd` | ✓ | ✓ | — | — |
| `StopFailure` | ✓ | ✓ | — | — |
| `SubagentStart` | ✓ | ✓ | — | — |
| `TeammateIdle` | ✓ | ✓ | — | — |
| `WorktreeCreate` | ✓ | ✓ | — | — |
| `WorktreeRemove` | ✓ | ✓ | — | — |
| `Elicitation` | ✓ | ✓ | — | — |
| `ElicitationResult` | ✓ | ✓ | — | — |

### Hook Administration Settings

| Setting | Location | Description |
|---------|----------|-------------|
| `disableAllHooks` | Any settings file | Disables all hooks (managed hooks immune if set by user/project) |
| `allowManagedHooksOnly` | Managed settings only | Blocks user, project, and non-force-enabled plugin hooks |
| `allowedHttpHookUrls` | Any settings file | Allowlist of URL patterns for HTTP hooks (supports `*` wildcard) |
| `httpHookAllowedEnvVars` | Any settings file | Allowlist of env vars HTTP hooks can interpolate into headers |

### The `/hooks` Menu

Type `/hooks` in interactive mode to open a read-only browser of all configured hooks. Shows every event with a count, matchers, handler details, and the settings file source (`User`, `Project`, `Local`, `Plugin`, `Session`, `Built-in`).

---

## Capabilities Summary

| Feature | File(s) | Scope | Shared via VCS |
|---------|---------|-------|----------------|
| Project instructions | `CLAUDE.md` / `.claude/CLAUDE.md` | Project | Yes |
| Personal project instructions | `CLAUDE.local.md` | Local | No (gitignored) |
| User global instructions | `~/.claude/CLAUDE.md` | All projects | No |
| Managed org instructions | `/Library/.../CLAUDE.md` etc. | All users | Via MDM/deployment |
| Pathed/globbed rules | `.claude/rules/*.md` | Project or user | Yes |
| `@file` imports in CLAUDE.md | `@path/to/file` syntax | Any CLAUDE.md | Depends on path |
| Project subagents/skills | `.claude/agents/*.md` | Project | Yes |
| User global subagents | `~/.claude/agents/*.md` | All projects | No |
| Project hooks & settings | `.claude/settings.json` | Project | Yes |
| Local hooks & settings | `.claude/settings.local.json` | Local | No (gitignored) |
| User global hooks & settings | `~/.claude/settings.json` | All projects | No |
| Managed hooks & settings | `managed-settings.json` | All users | Via MDM/deployment |
| Auto memory | `~/.claude/projects/<proj>/memory/` | Per working tree | No |
| `AGENTS.md` standard | `@AGENTS.md` import in CLAUDE.md | Any scope | Depends on import path |
| `agentskills.io` standard | n/a | n/a | n/a |

> **Notes:**
> - `AGENTS.md` is **not** natively auto-loaded by Claude Code; it must be explicitly `@`-imported inside a `CLAUDE.md` file to take effect.
> - The `agentskills.io` standard is **not** used by Claude Code; subagents use a proprietary `.claude/agents/` system defined with YAML frontmatter.

---

## Sources

| Resource | URL |
|----------|-----|
| Memory / CLAUDE.md | https://code.claude.com/docs/en/memory |
| Settings reference | https://code.claude.com/docs/en/settings |
| Hooks reference | https://code.claude.com/docs/en/hooks |
| Subagents | https://code.claude.com/docs/en/sub-agents |
| Skills | https://code.claude.com/docs/en/skills |
| Permissions | https://code.claude.com/docs/en/permissions |
| CLI reference | https://code.claude.com/docs/en/cli-reference |
| Overview | https://code.claude.com/docs/en/overview |
