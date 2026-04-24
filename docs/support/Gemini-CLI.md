# Gemini CLI — Directive Files & Configuration Reference

**Command:** `gemini`
**Website:** [geminicli.com](https://geminicli.com)
**GitHub:** [google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)

---

## Table of Contents

1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [Instruction Hierarchy](#instruction-hierarchy)
4. [GEMINI.md Format](#geminimd-format)
5. [@file Imports](#file-imports)
6. [AGENTS.md Support](#agentsmd-support)
7. [Skills](#skills)
8. [Subagents](#subagents)
9. [Hooks](#hooks)
10. [Configuration (settings.json)](#configuration-settingsjson)
11. [Capabilities Summary](#capabilities-summary)
12. [Sources](#sources)

---

## Overview

Gemini CLI is Google's terminal-based AI coding agent powered by the Gemini model family. It uses a hierarchical system of **context files** (`GEMINI.md` by default) to provide persistent instructions to the model, a **hooks** system for intercepting and customizing the agentic loop, a **skills** system for reusable agent behaviors, and a rich `settings.json` configuration layer.

---

## File Structure

```
~/.gemini/
├── GEMINI.md                    # User global instructions (all projects)
├── settings.json                # User global config + hooks
└── skills/
    └── <skill-folder>/
        └── SKILL.md             # User global skill

<project>/
├── GEMINI.md                    # Project root instructions
└── .gemini/
    ├── settings.json            # Project-level config + hooks
    └── skills/
        └── <skill-folder>/
            └── SKILL.md         # Project-level skill

<project>/subdir/
└── GEMINI.md                    # Loaded JIT when files in this dir are accessed
```

**System-level settings (read-only overrides, managed by admins):**
- Linux: `/etc/gemini-cli/settings.json`
- Windows: `C:\ProgramData\gemini-cli\settings.json`
- macOS: `/Library/Application Support/GeminiCli/settings.json`

---

## Instruction Hierarchy

Context files are loaded and concatenated in the following order (earlier = more general, later = more specific):

1. **Global:** `~/.gemini/GEMINI.md` — applies to all projects for the current user
2. **Parent directories:** Starting from the CWD, the CLI walks upward through parent directories, loading any `GEMINI.md` found at each level, stopping at the first directory containing `.git` or at the home directory
3. **Workspace root:** `./GEMINI.md` in the current working directory
4. **Subdirectories (JIT):** `GEMINI.md` files in subdirectories are loaded **on-demand** (Just-In-Time) when Gemini accesses a file in that directory — they are NOT loaded upfront

The concatenated result of all found files is sent with every prompt. Use `/memory show` to inspect the combined context and `/memory reload` to force a rescan.

> **Key setting:** The boundary for upward traversal is controlled by `context.memoryBoundaryMarkers` (default: `[".git"]`). An empty array disables parent traversal. Maximum directories scanned is controlled by `context.discoveryMaxDirs` (default: `200`).

> **JIT control:** Set `experimental.jitContext: false` in `settings.json` to load all `GEMINI.md` files upfront instead of on-demand.

---

## GEMINI.md Format

Context files are plain Markdown. They can contain any instructional content: coding standards, project conventions, personas, component-specific notes, etc.

```markdown
# Project: My TypeScript Library

## General Instructions

- When you generate new TypeScript code, follow the existing coding style.
- Ensure all new functions and classes have JSDoc comments.
- Prefer functional programming paradigms where appropriate.
- All code must be compatible with TypeScript 5.0 and Node.js 20+.

## Coding Style

- Use 2 spaces for indentation.
- Prefix interface names with `I` (for example, `IUserService`).
- Private class members should be prefixed with an underscore (`_`).
- Always use strict equality (`===` and `!==`).

## Component: `src/api/client.ts`

- This file handles all outbound API requests.
- When adding new API call functions, ensure they include robust error handling
  and logging.
- Use the existing `fetchWithRetry` utility for all GET requests.

## Dependencies

- Avoid introducing new external dependencies unless absolutely necessary.
- If a new dependency is required, state the reason.
```

**Memory management commands:**
- `/memory show` — display the full concatenated context currently loaded
- `/memory reload` — force rescan and reload of all context files
- `/memory add <text>` — append text to `~/.gemini/GEMINI.md`

---

## @file Imports

Large `GEMINI.md` files can be modularized by importing other Markdown files using the `@path/to/file.md` syntax. Both relative and absolute paths are supported.

```markdown
# Main GEMINI.md

This is the top-level project context.

@./components/api-instructions.md

More content here.

@../shared/style-guide.md

@/absolute/path/to/security-policy.md
```

Imports are processed by the [Memory Import Processor](https://geminicli.com/docs/reference/memport). The imported file's content is inlined at the `@` directive location.

---

## AGENTS.md Support

`AGENTS.md` is **not natively supported** as a default context filename. Gemini CLI defaults to `GEMINI.md`.

To include `AGENTS.md` (e.g., for cross-agent compatibility), configure the `context.fileName` setting in `settings.json` to list multiple filenames. All listed filenames are searched during context discovery.

**`~/.gemini/settings.json` or `.gemini/settings.json`:**

```json
{
  "context": {
    "fileName": ["AGENTS.md", "CONTEXT.md", "GEMINI.md"]
  }
}
```

With this configuration, Gemini CLI will look for all three filenames at each directory level and load any that exist.

---

## Skills

Skills are reusable, composable agent behaviors defined in `SKILL.md` files. They must be enabled via configuration.

### Enable Skills

```json
{
  "skills": {
    "enabled": true,
    "disabled": []
  }
}
```

### Skill File Locations

| Scope | Path |
|---|---|
| Project | `.gemini/skills/<skill-folder>/SKILL.md` |
| User global | `~/.gemini/skills/<skill-folder>/SKILL.md` |

### Example SKILL.md

```markdown
# Skill: Code Review

## Description
Perform a thorough code review focusing on correctness, security, and style.

## Instructions

When asked to review code:
1. Check for correctness: logic errors, edge cases, null pointer risks.
2. Check for security issues: input validation, injection risks, exposed secrets.
3. Check for style: adherence to project conventions defined in GEMINI.md.
4. Summarize findings with severity: Critical / Warning / Suggestion.

## Output Format

Use the following structure:
- **Summary**: One-sentence overall assessment.
- **Issues**: Bulleted list with severity and file:line reference.
- **Suggestions**: Optional improvement ideas.
```

### Skills Configuration in settings.json

```json
{
  "skills": {
    "enabled": true,
    "disabled": ["skill-name-to-disable"]
  },
  "admin": {
    "skills": {
      "enabled": true
    }
  }
}
```

Discover and manage skills with the `/skills` command in the CLI. See the [Agent Skills tutorial](https://geminicli.com/docs/cli/tutorials/skills-getting-started/) for a full walkthrough.

---

## Subagents

Subagents allow Gemini CLI to spin up local or remote specialized agents as part of a task.

- **Status:** Generally available (enabled by default); ADK-based interactive/non-interactive agent sessions are experimental
- **Enable:** `experimental.enableAgents` is `true` by default

```json
{
  "experimental": {
    "enableAgents": true,
    "adk": {
      "agentSessionInteractiveEnabled": false,
      "agentSessionNoninteractiveEnabled": false
    }
  }
}
```

See the [Subagents](https://geminicli.com/docs/core/subagents/) and [Remote subagents](https://geminicli.com/docs/core/remote-agents/) documentation for details.

---

## Hooks

Hooks are scripts executed synchronously at specific points in the Gemini CLI agent loop. They can intercept, validate, enrich, block, or log agentic actions.

### Hook Events

| Event | Trigger | Primary Use |
|---|---|---|
| `SessionStart` | Session begins (startup, resume, clear) | Initialize resources, inject context |
| `SessionEnd` | Session ends (exit, clear) | Clean up, save state |
| `BeforeAgent` | After user submits prompt, before planning | Add context, validate prompts, block turns |
| `AfterAgent` | Agent loop ends | Review output, force retry or halt |
| `BeforeModel` | Before sending request to LLM | Modify prompts, swap models, mock responses |
| `AfterModel` | After receiving LLM response | Filter/redact responses, log interactions |
| `BeforeToolSelection` | Before LLM selects tools | Filter available tools, optimize selection |
| `BeforeTool` | Before a tool executes | Validate arguments, block dangerous operations |
| `AfterTool` | After a tool executes | Process results, run tests, hide results |
| `PreCompress` | Before context compression | Save state, notify user |
| `Notification` | System notification occurs | Forward to desktop alerts, logging |

### Configuration Scopes (Precedence, Highest to Lowest)

1. **Project:** `.gemini/settings.json`
2. **User:** `~/.gemini/settings.json`
3. **System:** `/etc/gemini-cli/settings.json`
4. **Extensions:** Hooks defined by installed extensions

### Hook Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | string | Yes | Execution engine. Currently only `"command"` is supported. |
| `command` | string | Yes* | Shell command to execute. Required when `type` is `"command"`. |
| `name` | string | No | Friendly name for identifying the hook in logs and CLI commands. |
| `timeout` | number | No | Execution timeout in milliseconds (default: `60000`). |
| `description` | string | No | Brief explanation of the hook's purpose. |
| `matcher` | string | No | Filter for which tools/triggers fire this hook (see below). |

### Matchers

- **Tool events** (`BeforeTool`, `AfterTool`): matcher is a **Regular Expression** (e.g., `"write_.*"`)
- **Lifecycle events** (`SessionStart`, etc.): matcher is an **Exact String** (e.g., `"startup"`)
- **Wildcards:** `"*"` or `""` (empty string) matches all occurrences

### Strict JSON Requirements ("The Golden Rule")

Hooks communicate via `stdin` (input) and `stdout` (output).

1. **Silence is mandatory:** Do not print any plain text to `stdout` — only the final JSON object.
2. **Pollution = failure:** Any non-JSON text on `stdout` breaks parsing. The CLI defaults to "Allow" and treats the entire output as a `systemMessage`.
3. **Debug via stderr:** Use `stderr` for all logging (`echo "debug" >&2`). Gemini CLI captures stderr but never parses it.

### Exit Codes

| Code | Meaning | Behavior |
|---|---|---|
| `0` | Success | `stdout` is parsed as JSON. Use for all logic including intentional blocks. |
| `2` | System Block | Critical block — the target action is aborted. `stderr` is used as the rejection reason. |
| Other | Warning | Non-fatal failure. A warning is shown; interaction proceeds with original parameters. |

### Environment Variables Available to Hooks

| Variable | Description |
|---|---|
| `GEMINI_PROJECT_DIR` | Absolute path to the project root |
| `GEMINI_PLANS_DIR` | Absolute path to the plans directory |
| `GEMINI_SESSION_ID` | Unique ID for the current session |
| `GEMINI_CWD` | Current working directory |
| `CLAUDE_PROJECT_DIR` | Alias for `GEMINI_PROJECT_DIR` (compatibility) |

### Complete Example `settings.json` with Hooks

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "name": "load-session-context",
            "type": "command",
            "command": "$GEMINI_PROJECT_DIR/.gemini/hooks/session-start.sh",
            "timeout": 10000,
            "description": "Inject git log and environment info at session start"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "name": "save-session-summary",
            "type": "command",
            "command": "$GEMINI_PROJECT_DIR/.gemini/hooks/session-end.sh",
            "timeout": 5000,
            "description": "Persist session summary to a log file"
          }
        ]
      }
    ],
    "BeforeTool": [
      {
        "matcher": "write_file|replace_in_file",
        "hooks": [
          {
            "name": "security-check",
            "type": "command",
            "command": "$GEMINI_PROJECT_DIR/.gemini/hooks/security.sh",
            "timeout": 5000,
            "description": "Block writes to sensitive paths"
          }
        ]
      },
      {
        "matcher": "run_shell_command",
        "hooks": [
          {
            "name": "shell-audit",
            "type": "command",
            "command": "$GEMINI_PROJECT_DIR/.gemini/hooks/audit-shell.sh",
            "timeout": 3000,
            "description": "Log all shell commands for auditing"
          }
        ]
      }
    ],
    "AfterTool": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "name": "post-tool-logger",
            "type": "command",
            "command": "$GEMINI_PROJECT_DIR/.gemini/hooks/log-tool.sh",
            "timeout": 2000,
            "description": "Log tool results to a file"
          }
        ]
      }
    ],
    "BeforeAgent": [
      {
        "hooks": [
          {
            "name": "inject-git-context",
            "type": "command",
            "command": "$GEMINI_PROJECT_DIR/.gemini/hooks/git-context.sh",
            "timeout": 5000,
            "description": "Inject recent git history into context"
          }
        ]
      }
    ],
    "Notification": [
      {
        "hooks": [
          {
            "name": "desktop-notify",
            "type": "command",
            "command": "$GEMINI_PROJECT_DIR/.gemini/hooks/notify.sh",
            "timeout": 3000,
            "description": "Forward notifications to the OS desktop"
          }
        ]
      }
    ]
  },
  "hooksConfig": {
    "enabled": true,
    "notifications": true,
    "disabled": []
  }
}
```

### Example Hook Script (`security.sh`)

```bash
#!/bin/bash
# Reads tool call from stdin as JSON, blocks writes to /etc and ~/.ssh

INPUT=$(cat)
TOOL_ARGS=$(echo "$INPUT" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('tool_args', {}).get('path', ''))" 2>/dev/null)

# Debug to stderr only
echo "security-check: path=$TOOL_ARGS" >&2

if echo "$TOOL_ARGS" | grep -qE '^(/etc|~/.ssh)'; then
  # Exit 0 with a deny decision
  echo '{"decision": "deny", "reason": "Writes to /etc and ~/.ssh are not permitted."}'
  exit 0
fi

# Allow
echo '{"decision": "allow"}'
exit 0
```

### Managing Hooks via CLI

```
/hooks panel             # Open interactive hooks panel
/hooks enable-all        # Enable all configured hooks
/hooks disable-all       # Disable all configured hooks
/hooks enable <name>     # Enable a specific hook by name
/hooks disable <name>    # Disable a specific hook by name
```

---

## Configuration (settings.json)

Settings files use JSON. There are four layers, in order of increasing precedence:

| Layer | Location | Scope |
|---|---|---|
| System defaults | `/etc/gemini-cli/system-defaults.json` | Lowest — base defaults |
| User | `~/.gemini/settings.json` | All sessions for current user |
| Project | `.gemini/settings.json` | Current project only |
| System overrides | `/etc/gemini-cli/settings.json` | Highest — admin overrides |

JSON schema available at:
- Local: `schemas/settings.schema.json` (in the repo)
- Hosted: `https://raw.githubusercontent.com/google-gemini/gemini-cli/main/schemas/settings.schema.json`

String values in `settings.json` support environment variable expansion: `$VAR_NAME`, `${VAR_NAME}`, `${VAR_NAME:-default}`.

### Key Configuration Sections

```json
{
  "general": {
    "preferredEditor": "code",
    "vimMode": false,
    "defaultApprovalMode": "default",
    "enableNotifications": false,
    "sessionRetention": {
      "enabled": true,
      "maxAge": "30d",
      "maxCount": 100
    },
    "topicUpdateNarration": true
  },

  "model": {
    "name": "gemini-2.5-pro",
    "maxSessionTurns": -1,
    "compressionThreshold": 0.5
  },

  "context": {
    "fileName": ["GEMINI.md"],
    "includeDirectoryTree": true,
    "discoveryMaxDirs": 200,
    "memoryBoundaryMarkers": [".git"],
    "fileFiltering": {
      "respectGitIgnore": true,
      "respectGeminiIgnore": true
    }
  },

  "skills": {
    "enabled": true,
    "disabled": []
  },

  "experimental": {
    "enableAgents": true,
    "jitContext": true,
    "memoryV2": true,
    "autoMemory": false,
    "worktrees": false,
    "adk": {
      "agentSessionInteractiveEnabled": false,
      "agentSessionNoninteractiveEnabled": false
    }
  },

  "hooksConfig": {
    "enabled": true,
    "notifications": true,
    "disabled": []
  },

  "hooks": {
    "SessionStart": [],
    "SessionEnd": [],
    "BeforeAgent": [],
    "AfterAgent": [],
    "BeforeModel": [],
    "AfterModel": [],
    "BeforeToolSelection": [],
    "BeforeTool": [],
    "AfterTool": [],
    "PreCompress": [],
    "Notification": []
  },

  "tools": {
    "sandbox": "docker",
    "allowed": ["run_shell_command(git status)", "run_shell_command(npm test)"],
    "exclude": [],
    "useRipgrep": true
  },

  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["path/to/mcp-server.js"],
      "env": {},
      "trust": false
    }
  },

  "security": {
    "disableYoloMode": false,
    "enablePermanentToolApproval": false
  },

  "privacy": {
    "usageStatisticsEnabled": true
  },

  "telemetry": {
    "enabled": false,
    "target": "local",
    "logPrompts": false
  }
}
```

### AGENTS.md / Custom Context Filename

```json
{
  "context": {
    "fileName": ["AGENTS.md", "CONTEXT.md", "GEMINI.md"]
  }
}
```

### Skills + Experimental Flags

```json
{
  "skills": {
    "enabled": true,
    "disabled": []
  },
  "experimental": {
    "enableAgents": true,
    "jitContext": true,
    "autoMemory": false,
    "worktrees": false
  }
}
```

---

## Capabilities Summary

| Capability | Support | Notes |
|---|---|---|
| Global instructions | Yes | `~/.gemini/GEMINI.md` |
| Project instructions | Yes | `<project>/GEMINI.md` |
| Subdirectory JIT instructions | Yes | Loaded on-demand when files accessed |
| Parent directory traversal | Yes | Walks up to `.git` root or home |
| `@file` imports in GEMINI.md | Yes | Relative and absolute paths |
| Custom context filename | Yes | `context.fileName` in `settings.json` |
| AGENTS.md support | Indirect | Add to `context.fileName` array |
| Skills (SKILL.md) | Yes | `skills.enabled: true` required |
| Subagents | Yes (default on) | `experimental.enableAgents: true` |
| ADK agent sessions | Experimental | `experimental.adk.*` flags |
| Hooks | Yes | `hooks` key in `settings.json` |
| Hook types | `command` only | Executes shell commands |
| Hook scopes | Project, User, System, Extensions | Layered precedence |
| Hook interactive management | Yes | `/hooks panel`, `/hooks enable/disable` |
| JIT context loading | Yes (default on) | `experimental.jitContext` |
| Auto memory extraction | Experimental | `experimental.autoMemory` |
| Memory V2 (direct file editing) | Yes (default on) | `experimental.memoryV2` |
| Git worktrees | Experimental | `experimental.worktrees` |
| MCP servers | Yes | `mcpServers` in `settings.json` |
| Sandboxing | Yes (opt-in) | Docker, Podman, custom |
| Plan Mode | Yes | `--approval-mode=plan` |
| AGENTS.md standard | 🔧 Requires configuration | Not natively auto-loaded; requires setting `context.fileName` in `~/.gemini/config.json` to include `AGENTS.md` |
| agentskills.io standard | ✅ | `.gemini/skills/<folder>/SKILL.md` follows the agentskills.io open standard |

---

## Sources

- [Project context (GEMINI.md)](https://geminicli.com/docs/cli/gemini-md/)
- [Configuration reference](https://geminicli.com/docs/reference/configuration/)
- [Hooks overview](https://geminicli.com/docs/hooks/)
- [Hooks reference](https://geminicli.com/docs/hooks/reference/)
- [Writing hooks guide](https://geminicli.com/docs/hooks/writing-hooks/)
- [Hooks best practices](https://geminicli.com/docs/hooks/best-practices/)
- [Agent Skills](https://geminicli.com/docs/cli/skills/)
- [Subagents](https://geminicli.com/docs/core/subagents/)
- [Memory import processor](https://geminicli.com/docs/reference/memport/)
- [Commands reference](https://geminicli.com/docs/reference/commands/)
