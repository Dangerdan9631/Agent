# Cursor CLI — Directive Files & Configuration Reference

A comprehensive guide to configuring Cursor CLI's directive files system, hooks, and agent behavior from the terminal.

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Usage](#usage)
4. [Configuration Files](#configuration-files)
5. [Project Rules (`.cursor/rules/`)](#project-rules-cursorrules)
6. [AGENTS.md Support](#agentsmd-support)
7. [Hooks](#hooks)
8. [Capabilities Summary](#capabilities-summary)
9. [Sources](#sources)

---

## Overview

Cursor CLI is a terminal-based AI coding agent that lets you write, review, and modify code directly from your shell. It supports both interactive sessions and non-interactive (print/automation) modes.

Key characteristics:

- Uses the **same underlying agent** as the Cursor IDE
- Reads the same `.cursor/rules/` files from the working directory
- Reads global User Rules from Cursor Settings (same user configuration as the IDE)
- Reads `hooks.json` from both the user home directory and working directory — identical behavior to the IDE
- Supports all modes: Agent, Plan, and Ask

---

## Installation

### macOS / Linux / WSL

```bash
curl https://cursor.com/install -fsS | bash
```

### Windows (PowerShell)

```powershell
irm 'https://cursor.com/install?win32=true' | iex
```

---

## Usage

### Interactive Mode

Start a conversational session:

```bash
# Start interactive session
agent

# Start with an initial prompt
agent "refactor the auth module to use JWT tokens"
```

### Non-Interactive (Print) Mode

For scripts, CI pipelines, and automation:

```bash
# Run with a specific prompt and model
agent -p "find and fix performance issues" --model "gpt-5.2"

# Include git changes for review
agent -p "review these changes for security issues" --output-format text
```

### Modes

| Mode   | Description                                              | How to Activate                           |
|--------|----------------------------------------------------------|-------------------------------------------|
| Agent  | Full access to all tools for complex coding tasks        | Default (no `--mode` needed)              |
| Plan   | Design your approach before coding with clarifying questions | `Shift+Tab`, `/plan`, `--plan`, `--mode=plan` |
| Ask    | Read-only exploration without making changes             | `/ask`, `--mode=ask`                      |

### Session Management

```bash
# List all previous chats
agent ls

# Resume latest conversation
agent resume

# Continue the previous session
agent --continue

# Resume a specific conversation
agent --resume="chat-id-here"
```

### Cloud Agent Handoff

Push a conversation to a Cloud Agent to continue running while you're away:

```bash
& refactor the auth module and add comprehensive tests
```

Pick up Cloud Agent tasks at [cursor.com/agents](https://cursor.com/agents).

### Other Controls

```bash
# Configure sandbox mode (enabled/disabled)
agent --sandbox enabled

# Toggle Max Mode
/max-mode on
```

---

## Configuration Files

Cursor CLI uses the same configuration hierarchy as the IDE:

| Source            | Path                                              |
|-------------------|---------------------------------------------------|
| Project rules     | `<project>/.cursor/rules/*.mdc` or `*.md`         |
| Project hooks     | `<project>/.cursor/hooks.json`                    |
| User rules        | Cursor IDE Settings → Rules                       |
| User hooks        | `~/.cursor/hooks.json`                            |
| Enterprise hooks  | macOS: `/Library/Application Support/Cursor/hooks.json` · Linux/WSL: `/etc/cursor/hooks.json` · Windows: `C:\ProgramData\Cursor\hooks.json` |

All configuration is loaded from the **current working directory** when `agent` is invoked.

---

## Project Rules (`.cursor/rules/`)

Project rules work identically to the Cursor IDE. Place rule files in `.cursor/rules/` in your project root.

### File Formats

- **`.mdc`** (preferred) — Markdown with YAML frontmatter
- **`.md`** — Plain Markdown (treated the same as `.mdc`)

### YAML Frontmatter Options

| Field          | Type    | Description                                                  |
|----------------|---------|--------------------------------------------------------------|
| `alwaysApply`  | boolean | If `true`, rule is injected into every conversation          |
| `description`  | string  | Summary used by the agent to decide when to apply the rule   |
| `globs`        | string  | File glob pattern(s); rule is auto-attached for matching files |
| *(none)*       | —       | No frontmatter = manual-only (must be explicitly referenced) |

### Example Rule Files

**Always-apply rule** — injected into every session:

```markdown
---
alwaysApply: true
---

# Project Conventions

- Use TypeScript strict mode
- Prefer `const` over `let`
- All async functions must handle errors explicitly
- Run `npm test` after every change
```

**Description-based rule** — agent decides when to apply:

```markdown
---
description: "Security review checklist for authentication code"
---

# Auth Security Rules

- Validate all user inputs at system boundaries
- Never store plaintext passwords
- Use parameterized queries for all database access
- Check for OWASP Top 10 vulnerabilities before completing
```

**Glob-based rule** — auto-attached for matching files:

```markdown
---
globs: "**/*.test.ts"
---

# Testing Conventions

- Use `describe`/`it` block structure
- Every test must have an assertion
- Mock external services; never call live APIs in tests
- Aim for 80%+ coverage on new code
```

**Manual-only rule** — no frontmatter:

```markdown
# Database Migration Guide

Follow these steps when creating a migration:
1. Create file in `db/migrations/` with timestamp prefix
2. Include both `up` and `down` functions
3. Test rollback before merging
```

### Directory Layout

```
.cursor/
└── rules/
    ├── always-conventions.mdc     # alwaysApply: true
    ├── security-checklist.mdc     # description-based
    ├── test-style.mdc             # glob-based
    └── migration-guide.md         # manual-only
```

---

## AGENTS.md Support

Cursor CLI supports `AGENTS.md` files — both at the project root and nested in subdirectories. These files provide agent-readable instructions scoped to their directory level.

```
project/
├── AGENTS.md                # Root-level agent instructions
├── src/
│   ├── AGENTS.md            # Instructions for src/ subtree
│   └── auth/
│       └── AGENTS.md        # Instructions for auth/ subtree
```

Example `AGENTS.md`:

```markdown
# Agent Instructions

## Build & Test
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`

## Code Style
- Follow the ESLint configuration in `.eslintrc.js`
- Use the Prettier config for formatting

## Important Notes
- Do not modify files in `dist/` directly
- Always update `CHANGELOG.md` when fixing bugs
```

---

## Hooks

Hooks let you observe, control, and extend the agent loop using custom scripts. They are **identical** between Cursor CLI and the Cursor IDE — the CLI reads the same `hooks.json` files from the user home directory (`~/.cursor/hooks.json`) and from the working directory (`<project>/.cursor/hooks.json`).

### What Hooks Can Do

- Run formatters after file edits
- Add analytics and telemetry
- Scan for PII or secrets before sending to the model
- Gate risky shell commands or MCP tool calls
- Control subagent (Task tool) execution
- Inject context at session start

### Hook File Locations

| Scope        | Path                                                    | Priority |
|--------------|---------------------------------------------------------|----------|
| Enterprise   | macOS: `/Library/Application Support/Cursor/hooks.json` · Linux/WSL: `/etc/cursor/hooks.json` · Windows: `C:\ProgramData\Cursor\hooks.json` | Highest |
| Team         | Cloud-distributed via dashboard (Enterprise only)       | 2nd      |
| Project      | `<project-root>/.cursor/hooks.json`                     | 3rd      |
| User         | `~/.cursor/hooks.json`                                  | Lowest   |

When hooks conflict, higher-priority sources take precedence.

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

| Exit Code | Meaning                                                             |
|-----------|---------------------------------------------------------------------|
| `0`       | Hook succeeded; use the JSON output                                 |
| `2`       | Block the action (equivalent to `"permission": "deny"`)             |
| Other     | Hook failed; action proceeds (fail-open by default)                 |

Set `failClosed: true` on the hook definition to block on any failure instead.

#### Prompt Hooks

Use an LLM to evaluate a natural language condition — no scripting required.

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

- Returns `{ "ok": boolean, "reason?": string }`
- Uses a fast model for quick evaluation
- `$ARGUMENTS` placeholder is auto-replaced with hook input JSON

### Agent Hook Events

| Event                   | When It Fires                                             | Can Block? |
|-------------------------|-----------------------------------------------------------|------------|
| `sessionStart`          | New conversation created                                  | No (fire-and-forget) |
| `sessionEnd`            | Conversation ends                                         | No (fire-and-forget) |
| `preToolUse`            | Before any tool execution (all tool types)                | Yes        |
| `postToolUse`           | After successful tool execution                           | No         |
| `postToolUseFailure`    | When a tool fails, times out, or is denied                | No         |
| `subagentStart`         | Before spawning a subagent (Task tool)                    | Yes        |
| `subagentStop`          | When a subagent completes, errors, or is aborted          | No         |
| `beforeShellExecution`  | Before any shell command runs                             | Yes        |
| `afterShellExecution`   | After a shell command executes                            | No         |
| `beforeMCPExecution`    | Before an MCP tool executes                               | Yes        |
| `afterMCPExecution`     | After an MCP tool executes                                | No         |
| `beforeReadFile`        | Before the agent reads a file                             | Yes        |
| `afterFileEdit`         | After the agent edits a file                              | No         |
| `beforeSubmitPrompt`    | After user hits send, before backend request              | Yes        |
| `preCompact`            | Before context window compaction                          | No         |
| `stop`                  | When the agent loop ends                                  | No (can trigger follow-up) |
| `afterAgentResponse`    | After the agent completes an assistant message            | No         |
| `afterAgentThought`     | After the agent completes a thinking block                | No         |

### Tab Hook Events (Cursor IDE only — inline completions)

| Event               | When It Fires                                    |
|---------------------|--------------------------------------------------|
| `beforeTabFileRead` | Before Tab reads a file for inline completions   |
| `afterTabFileEdit`  | After Tab edits a file                           |

### Per-Hook Configuration Options

| Field        | Type              | Default    | Description                                                      |
|--------------|-------------------|------------|------------------------------------------------------------------|
| `command`    | string            | *required* | Script path or shell command                                     |
| `type`       | `"command"` \| `"prompt"` | `"command"` | Hook execution type                               |
| `timeout`    | number            | platform   | Execution timeout in seconds                                     |
| `loop_limit` | number \| `null`  | `5`        | Max auto-follow-ups for `stop`/`subagentStop` hooks              |
| `failClosed` | boolean           | `false`    | When `true`, hook failures block the action instead of allowing  |
| `matcher`    | string (regex)    | —          | Filter criteria for when the hook fires                          |

### Matcher Reference

| Hook                                             | Matched Against                                    |
|--------------------------------------------------|----------------------------------------------------|
| `preToolUse` / `postToolUse` / `postToolUseFailure` | Tool type: `Shell`, `Read`, `Write`, `Grep`, `Delete`, `Task`, `MCP:<tool_name>` |
| `subagentStart` / `subagentStop`                 | Subagent type: `generalPurpose`, `explore`, `shell`, etc. |
| `beforeShellExecution` / `afterShellExecution`   | Full shell command string                          |
| `beforeReadFile`                                 | Tool type: `TabRead`, `Read`, etc.                 |
| `afterFileEdit`                                  | Tool type: `TabWrite`, `Write`, etc.               |
| `beforeSubmitPrompt`                             | Value `UserPromptSubmit`                           |
| `stop`                                           | Value `Stop`                                       |
| `afterAgentResponse`                             | Value `AgentResponse`                              |
| `afterAgentThought`                              | Value `AgentThought`                               |

### Common Input Schema (all hooks)

Every hook receives these base fields in addition to hook-specific fields:

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

### Environment Variables Available to Hook Scripts

| Variable              | Description                                             | Always Set?        |
|-----------------------|---------------------------------------------------------|--------------------|
| `CURSOR_PROJECT_DIR`  | Workspace root directory                                | Yes                |
| `CURSOR_VERSION`      | Cursor version string                                   | Yes                |
| `CURSOR_USER_EMAIL`   | Authenticated user email                                | If logged in       |
| `CURSOR_TRANSCRIPT_PATH` | Path to the conversation transcript file             | If transcripts on  |
| `CURSOR_CODE_REMOTE`  | Set to `"true"` in remote workspaces                    | For remote only    |
| `CLAUDE_PROJECT_DIR`  | Alias for `CURSOR_PROJECT_DIR` (Claude compatibility)   | Yes                |

Session-scoped environment variables returned from `sessionStart` hooks are passed to all subsequent hook executions within that session.

### Full hooks.json Example

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [{ "command": ".cursor/hooks/session-init.sh" }],
    "sessionEnd":   [{ "command": ".cursor/hooks/audit.sh" }],
    "preToolUse": [
      {
        "command": ".cursor/hooks/validate-tool.sh",
        "matcher": "Shell|Read|Write"
      }
    ],
    "postToolUse":          [{ "command": ".cursor/hooks/audit-tool.sh" }],
    "subagentStart":        [{ "command": ".cursor/hooks/validate-subagent.sh" }],
    "subagentStop":         [{ "command": ".cursor/hooks/audit-subagent.sh" }],
    "beforeShellExecution": [{ "command": ".cursor/hooks/approve-shell.sh" }],
    "afterShellExecution":  [{ "command": ".cursor/hooks/audit.sh" }],
    "beforeMCPExecution":   [{ "command": ".cursor/hooks/approve-mcp.sh", "failClosed": true }],
    "afterMCPExecution":    [{ "command": ".cursor/hooks/audit.sh" }],
    "beforeReadFile":       [{ "command": ".cursor/hooks/check-file-access.sh" }],
    "afterFileEdit":        [{ "command": ".cursor/hooks/format.sh" }],
    "beforeSubmitPrompt":   [{ "command": ".cursor/hooks/validate-prompt.sh" }],
    "preCompact":           [{ "command": ".cursor/hooks/audit.sh" }],
    "stop":                 [{ "command": ".cursor/hooks/audit.sh", "loop_limit": 10 }],
    "afterAgentResponse":   [{ "command": ".cursor/hooks/log-response.sh" }],
    "afterAgentThought":    [{ "command": ".cursor/hooks/log-thought.sh" }]
  }
}
```

### Example Hook Scripts

**Session init — inject context:**

```bash
#!/bin/bash
# ~/.cursor/hooks/session-init.sh
cat > /dev/null  # consume stdin

echo '{
  "env": { "NODE_ENV": "development" },
  "additional_context": "This project uses pnpm. Always use pnpm, not npm."
}'
exit 0
```

**Block dangerous git commands:**

```bash
#!/bin/bash
# .cursor/hooks/block-git.sh
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.command // ""')

if echo "$COMMAND" | grep -qE 'git (push --force|reset --hard|clean -fd)'; then
  echo '{"permission":"deny","user_message":"Destructive git command blocked."}'
  exit 0
fi

echo '{"permission":"allow"}'
exit 0
```

**Auto-format after file edits:**

```bash
#!/bin/bash
# .cursor/hooks/format.sh
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.file_path // ""')

if [[ "$FILE" == *.ts || "$FILE" == *.tsx ]]; then
  prettier --write "$FILE" 2>/dev/null
fi

exit 0
```

**Prompt-based security gate:**

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      {
        "type": "prompt",
        "prompt": "Does this shell command look safe? Deny any command that deletes files, modifies system configuration, or makes outbound network requests to unknown hosts.",
        "timeout": 15
      }
    ]
  }
}
```

**Stop hook — loop until tests pass:**

```bash
#!/bin/bash
# .cursor/hooks/retry-until-green.sh
INPUT=$(cat)
STATUS=$(echo "$INPUT" | jq -r '.status')
LOOP=$(echo "$INPUT" | jq -r '.loop_count')

if [[ "$STATUS" == "completed" && $LOOP -lt 3 ]]; then
  # Run tests and retry if they fail
  if ! npm test --silent 2>/dev/null; then
    echo '{"followup_message":"Tests are still failing. Please fix the remaining test errors."}'
    exit 0
  fi
fi

exit 0
```

---

## Capabilities Summary

| Feature                        | Cursor CLI | Cursor IDE |
|-------------------------------|:----------:|:----------:|
| `.cursor/rules/` (project)    | ✅         | ✅         |
| Global User Rules              | ✅         | ✅         |
| `.mdc` / `.md` rule files      | ✅         | ✅         |
| `alwaysApply` frontmatter      | ✅         | ✅         |
| `globs` frontmatter            | ✅         | ✅         |
| `description` frontmatter      | ✅         | ✅         |
| `AGENTS.md` (root + nested)    | ✅         | ✅         |
| `~/.cursor/hooks.json`         | ✅         | ✅         |
| `<project>/.cursor/hooks.json` | ✅         | ✅         |
| Enterprise hooks (system-wide) | ✅         | ✅         |
| All agent hook events          | ✅         | ✅         |
| Tab hook events                | ❌         | ✅         |
| Interactive terminal session   | ✅         | ❌         |
| Non-interactive / print mode   | ✅         | ❌         |
| Cloud Agent handoff            | ✅         | ✅         |
| Session resume                 | ✅         | ❌         |
| Sandbox controls               | ✅         | ✅         |
| Sudo password prompting        | ✅         | ❌         |
| `AGENTS.md` standard | ✅ root+nested | Root and nested `AGENTS.md` loaded natively; same as `.cursor/rules/` |
| `agentskills.io` standard | ❌ | No native skills system; community convention only |

---

## Sources

- [Cursor CLI Overview](https://cursor.com/docs/cli/overview)
- [Cursor Hooks Documentation](https://cursor.com/docs/hooks)
- [Third-Party Hooks (Claude Code compatibility)](https://cursor.com/docs/reference/third-party-hooks)
- [Hooks Partner Integrations Blog Post](https://cursor.com/blog/hooks-partners)
- [Cursor Cloud Agent](https://cursor.com/docs/cloud-agent)
