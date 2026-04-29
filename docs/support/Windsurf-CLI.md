# Windsurf CLI (Devin for Terminal) — Coding Agent Directive Files

> Documentation for the Windsurf CLI, branded as "Devin for Terminal".
> **Tool**: Windsurf CLI — [cli.windsurf.com](https://cli.windsurf.com) (docs at [cli.devin.ai](https://cli.devin.ai))

---

## Overview

Windsurf CLI is a local command-line coding agent from Windsurf/Cognition, marketed as **"Devin for Terminal"**. It runs directly in your terminal and gives you fast, interactive AI assistance with your local files and environment. It includes deep integration with the cloud-based [Devin](https://docs.devin.ai/) agent for optional hand-off to a full cloud environment.

The CLI is installed as the **`devin`** command and is included with Windsurf Pro, Max, and Teams subscriptions.

**Key characteristics:**
- Written in Rust, runs locally on your machine
- Multi-model: supports Claude Opus 4.7, GPT-5.5, SWE-1.6, and others
- Interactive REPL mode and single-turn (`-p`) mode for scripting/automation
- Permission modes: Normal, Accept Edits, Bypass, Autonomous (sandbox)
- Plan and Ask agent modes (`/plan`, `/ask`)
- Foreground and background subagent support
- Compatible with Claude Code hooks format

---

## Installation

```bash
# macOS / Linux / WSL
curl -fsSL https://cli.devin.ai/install.sh | bash

# Windows
# Download installer from cli.windsurf.com/docs
```

After installation, restart your terminal and run `devin` in any project directory.

---

## Basic Usage

```bash
devin                                    # Start interactive REPL
devin -- check out this code and suggest a feature  # REPL with initial prompt
devin -p "what does this file do?"       # Single-turn (no REPL), prints to stdout
devin -c                                 # Continue most recent session
devin -r                                 # Pick a session to resume
```

---

## File Structure

```
# Native config (Devin for Terminal)
~/.config/devin/
├── config.json                          # User-level config (model, permissions, etc.)
├── skills/
│   └── <skill-name>/
│       └── SKILL.md                     # Global skill definitions
└── agents/
    └── <profile-name>/
        └── AGENT.md                     # Global custom subagent profiles

# Per-project (committed to repo)
<project>/
├── .devin/
│   ├── config.json                      # Project config (MCP, permissions, import settings)
│   ├── config.local.json                # Personal overrides (auto-gitignored)
│   ├── hooks.v1.json                    # Lifecycle hooks (Claude Code compatible)
│   ├── skills/
│   │   └── <skill-name>/
│   │       └── SKILL.md                 # Project skill definitions
│   └── agents/
│       └── <profile-name>/
│           └── AGENT.md                 # Custom subagent profiles
├── AGENTS.md                            # Project instructions (always-on, native)
└── <subdir>/
    └── AGENTS.md                        # Directory-scoped instructions (lazily loaded)

# Windsurf IDE files (read via import)
<project>/
└── .windsurf/
    ├── rules/
    │   └── *.md                         # Imported workspace rules (frontmatter-controlled)
    └── skills/
        └── <skill-name>/
            └── SKILL.md                 # Imported project skills

~/.codeium/windsurf/memories/
└── global_rules.md                      # Global rules (imported from Windsurf IDE)

# Cross-tool skills
<project>/
└── .agents/
    └── skills/
        └── <skill-name>/
            └── SKILL.md                 # Agentskills.io standard (project)

~/.agents/skills/
└── <skill-name>/
    └── SKILL.md                         # Agentskills.io standard (user global)
```

---

## Rules & Instructions

### AGENTS.md (Native — Recommended)

The simplest and recommended way to provide instructions. Devin for Terminal reads `AGENTS.md` natively, without any configuration.

| Filename | Notes |
|----------|-------|
| `AGENTS.md` | Recommended |
| `AGENT.md` | Singular alternative |
| `CLAUDE.md` | Compatible with Claude Code |

**Loading behavior:**
- **Root-level** `AGENTS.md` — always-on, loaded at session start
- **Subdirectory** `AGENTS.md` — lazily loaded when the agent accesses files in that directory; walks up to the workspace root as needed

```markdown
# Project Rules

- Use TypeScript for all new files
- Package manager: pnpm (never npm or yarn)
- Run `pnpm lint` before committing
- Write tests for all new utility functions
```

### Importing Windsurf IDE Rules

Devin for Terminal imports `.windsurf/rules/*.md` rules from the working directory. These rules support the same YAML frontmatter as Windsurf IDE:

```markdown
---
trigger: always_on
---

All API endpoints must return JSON with a consistent envelope format.
```

**Trigger values:** `always_on`, `manual`, `model_decision`, `glob` (with `globs:` frontmatter for file patterns).

**Subdirectory support:** `.windsurf/rules/` directories can exist at multiple levels; rules are discovered lazily as the agent accesses files in subdirectories.

Windsurf IDE's global rules (`~/.codeium/windsurf/memories/global_rules.md`) are also read via the Windsurf import.

### Importing Cursor Rules

`.cursor/rules/*.md` and `.cursorrules` are also imported. Supports the same `alwaysApply`, `globs`, and `description` frontmatter as Cursor.

### Importing Claude Code Rules

The entire `.claude/` directory is imported by default, including commands, custom subagent definitions, and hooks.

### Controlling Imports

You can enable or disable reading from specific tool formats in `.devin/config.json` or `~/.config/devin/config.json`:

```json
{
  "read_config_from": {
    "cursor": true,
    "windsurf": true,
    "claude": true
  }
}
```

`AGENTS.md` is always read and cannot be disabled.

---

## Skills

Skills are reusable prompts and workflows bundled as `SKILL.md` files. The agent invokes them automatically when relevant, or users can trigger them with `/skill-name`.

### Where Skills Live

| Location | Scope | Committed? |
|----------|-------|------------|
| `.agents/skills/<name>/SKILL.md` | Project (cross-tool) | Yes |
| `.devin/skills/<name>/SKILL.md` | Project (native) | Yes |
| `.windsurf/skills/<name>/SKILL.md` | Project (windsurf import) | Yes |
| `~/.agents/skills/<name>/SKILL.md` | Global (cross-tool) | No |
| `~/.config/devin/skills/<name>/SKILL.md` | Global (native) | No |
| `~/.codeium/<channel>/skills/<name>/SKILL.md` | Global (channel-specific) | No |

`<channel>` is `windsurf`, `windsurf-next`, or `windsurf-insiders`. On Windows, the global path is `%APPDATA%\devin\skills\<name>\SKILL.md`.

Devin for Terminal supports the [agentskills.io](https://agentskills.io) open standard — third-party skill installation tools work with it.

### `SKILL.md` Format

```markdown
---
name: review
description: Review code changes before committing
allowed-tools:
  - read
  - grep
  - glob
  - exec
---

Review the current git diff and provide feedback:

1. Run `git diff --staged` (or `git diff` if nothing is staged)
2. Check for logic errors, missing error handling, security issues, style inconsistencies
3. Summarize findings and suggest improvements
```

### Skill Triggers

| Trigger | Description | Default |
|---------|-------------|---------|
| `user` | User can invoke with `/skill-name` | Enabled |
| `model` | Agent can invoke autonomously when relevant | Enabled |

---

## Subagents

Devin for Terminal has first-class subagent support. The main agent can spawn independent workers (foreground or background) to handle subtasks in parallel.

### Built-in Profiles

| Profile | Description | Tool Access |
|---------|-------------|-------------|
| `subagent_explore` | Read-only codebase exploration | Read-only only |
| `subagent_general` | General tasks including code changes | Full tool access (foreground) or pre-approved (background) |

### Custom Subagent Profiles

Define custom subagents as `AGENT.md` files in a named directory:

| Location | Scope |
|----------|-------|
| `.devin/agents/<profile>/AGENT.md` | Project-specific |
| `.agents/agents/<profile>/AGENT.md` | Project-specific (alternate) |
| `~/.config/devin/agents/<profile>/AGENT.md` | Global |

Also imports from `.claude/agents/*.md` (Claude Code agent format).

```markdown
---
name: reviewer
description: Reviews code changes for correctness and style
model: sonnet
allowed-tools:
  - read
  - grep
  - glob
  - exec
permissions:
  allow:
    - Exec(git diff)
    - Exec(git log)
  deny:
    - write
    - edit
---

You are a code review subagent. Review code changes thoroughly and report back.

Focus on correctness, security, style consistency, and performance.
Always cite specific file paths and line numbers.
```

---

## Hooks

Devin for Terminal uses a hook format **compatible with [Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks)**. Existing Claude Code hooks work automatically.

### Where Hooks Live

**Project-level:**

| Location | Description |
|----------|-------------|
| `.devin/hooks.v1.json` | Standalone hooks file (recommended) |
| `.devin/config.json` (`"hooks"` key) | Hooks in project config |
| `.devin/config.local.json` (`"hooks"` key) | Local overrides (gitignored) |
| `.claude/settings.json` (`"hooks"` key) | Claude Code format (imported by default) |
| `.claude/settings.local.json` (`"hooks"` key) | Claude Code local (imported by default) |

**User-level:**

| Location | Description |
|----------|-------------|
| `~/.config/devin/config.json` (`"hooks"` key) | User config (`%APPDATA%\devin\config.json` on Windows) |
| `~/.claude/settings.json` (`"hooks"` key) | Claude Code format |

> In `.devin/hooks.v1.json`, the hooks object is the **entire file** (no wrapper key needed). In all other locations, hooks are nested under a `"hooks"` key.

### Hook Events

| Event | When It Fires |
|-------|--------------|
| `PreToolUse` | Before a tool executes |
| `PostToolUse` | After a tool finishes |
| `PermissionRequest` | When a permission decision is needed |
| `UserPromptSubmit` | When the user submits a message |
| `Stop` | When the agent wants to stop |
| `SessionStart` | When a session begins |
| `SessionEnd` | When a session ends |

### Hook Format

```json
{
  "PreToolUse": [
    {
      "matcher": "exec",
      "hooks": [
        {
          "type": "command",
          "command": "./scripts/check-command.sh",
          "timeout": 10
        }
      ]
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `matcher` | Regex matched against the tool name. Empty string matches all tools. |
| `type` | `"command"` to run a shell command, or `"prompt"` to evaluate an LLM prompt. |
| `command` | Shell command to run (for `command` type). |
| `prompt` | LLM prompt to evaluate (for `prompt` type). |
| `timeout` | Timeout in seconds (optional). |

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success — hook continues normally |
| 2 | Block — action is denied (pre-hooks only) |
| Other | Error — logged but does not block |

### Verify Hooks

Use `/hooks` in the REPL to list all currently loaded hooks and their source files.

---

## Configuration

### Config File Locations

| Location | Scope | Notes |
|----------|-------|-------|
| `~/.config/devin/config.json` | User (global) | Model, theme, global permissions (`%APPDATA%\devin\config.json` on Windows) |
| `.devin/config.json` | Project | MCP servers, permissions, import settings (committed) |
| `.devin/config.local.json` | Project local | Personal overrides, secrets (auto-gitignored) |

### Configuration Precedence

| Priority | Source | Shared? |
|----------|--------|---------|
| 1 (highest) | Organization/Team settings | Yes (enterprise) |
| 2 | Session grants (interactive approvals) | No (in-memory) |
| 3 | Project local (`.devin/config.local.json`) | No (gitignored) |
| 4 | Project (`.devin/config.json`) | Yes (committed) |
| 5 (lowest) | User (`~/.config/devin/config.json`) | No (personal) |

---

## Capabilities Summary

| Feature | Supported | Notes |
|---------|-----------|-------|
| Global instructions | ✅ | `~/.codeium/windsurf/memories/global_rules.md` (via windsurf import) |
| Project rules (subdirectory) | ✅ | `.windsurf/rules/*.md` (imported), with activation modes |
| Workspace root instructions | ✅ | `AGENTS.md` / `AGENT.md` / `CLAUDE.md` natively |
| Nested/directory AGENTS.md | ✅ | Lazily loaded as agent accesses files in subdirectory |
| Glob-scoped rules | ✅ | Windsurf `trigger: glob` + `globs:` (via import) |
| `AGENTS.md` standard | ✅ | Native; root = always-on, subdir = lazily loaded |
| Skills | ✅ | `.devin/skills/`, `.windsurf/skills/`, `.agents/skills/` |
| Global skills | ✅ | `~/.config/devin/skills/`, `~/.codeium/<channel>/skills/` |
| `agentskills.io` standard | ✅ | `.agents/skills/` natively supported |
| Subagents | ✅ | Built-in and custom profiles; foreground + background |
| Hooks | ✅ | `.devin/hooks.v1.json`; Claude Code-compatible; `command` + `prompt` types |
| `@file.md` imports in rules | ❌ | Not supported |
| `.agents/rules` directory | ❌ | Not read natively |
| Workflows | ❌ | Windsurf workflows not imported by the CLI |
| Memories (auto) | ❌ | No Cascade-style auto-memory system |
| Enterprise system hooks | ❌ | No system-level path for Devin CLI (unlike Windsurf IDE) |

---

## Sources

- [Quickstart](https://cli.windsurf.com/docs) — Install and first steps
- [Essential Commands](https://cli.windsurf.com/docs/essential-commands) — REPL commands, modes, slash commands
- [Rules & AGENTS.md](https://cli.devin.ai/docs/extensibility/rules.md) — Native rules, AGENTS.md, imported rules
- [Skills Overview](https://cli.devin.ai/docs/extensibility/skills/overview.md) — Skills, invocation, skill paths
- [Hooks](https://cli.devin.ai/docs/extensibility/hooks/overview.md) — Hook events, format, config locations
- [Subagents](https://cli.devin.ai/docs/subagents.md) — Built-in and custom subagent profiles
- [Configuration](https://cli.devin.ai/docs/extensibility/configuration.md) — Config file format and precedence
- [Extensibility Overview](https://cli.windsurf.com/docs/extensibility/index.md) — How rules, skills, hooks, and MCP fit together
