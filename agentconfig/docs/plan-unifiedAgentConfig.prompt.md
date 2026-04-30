# Plan: `.agentconfig` Unified Agent Config Folder

The `.agentconfig/` folder is the single source of truth. A generator tool reads it and produces agent-native artifacts. The core design principle: **always-on instructions go into `AGENTS.md` only** for all agents that support it, and agent-native rule files receive only scoped/ai-decided/manual content — preventing any single agent from loading the same instruction twice.

---

## Folder Structure

```
.agentconfig/
├── config.yaml                 ← master config: targets, options
├── instructions/               ← flat; activation type set via frontmatter
│   ├── 01-coding-standards.md
│   ├── typescript.md
│   ├── performance.md
│   └── migration-guide.md
├── agents/                     ← subagent/custom-agent definitions
│   └── <name>.md               ← frontmatter (agent.yaml fields) + body (instructions)
├── skills/                     ← agentskills.io-compatible skills
│   └── <name>/
│       ├── SKILL.md
│       ├── scripts/
│       ├── examples/
│       └── references/
├── commands/                   ← manually invoked; Copilot prompts + agent workflows
│   └── deploy.md
└── hooks/
    ├── hooks.yaml              ← canonical hook definitions (normalized events)
    └── scripts/                ← *.sh / *.ps1 hook implementation files
```

---

## `config.yaml` Schema

```yaml
version: 1
targets:
  - copilot         # VS Code extension + CLI
  - cursor          # IDE + CLI
  - claude-code
  - gemini-cli
  - antigravity
  - codex           # cloud + CLI
  - windsurf
  - cline
options:
  overwrite: true
  output_dir: "."   # project root
```

---

## Instruction File Frontmatter Schema

`activation` determines how the instruction is loaded. All other frontmatter fields are optional unless noted.

```yaml
---
activation: always            # always | scoped | ai-decided | manual
# For activation: scoped
globs:
  - "**/*.ts"
  - "**/*.tsx"
# For activation: ai-decided or manual
description: "Apply when working with performance-critical code paths"
# For activation: manual — overrides filename as the invocation slug
name: "migration-guide"
# Restrict to only these targets (omit to generate for all targets in config.yaml)
targets: [copilot, cursor]
# Exclude specific targets (applied after targets filter)
excludedTargets: [copilot-code-review]
---
```

`activation: always` is the default when frontmatter is omitted entirely.

---

## `agents/<name>.md` Schema

Agent definition files use YAML frontmatter for config and the body for the agent's instructions/system prompt.

```yaml
---
name: security-reviewer
description: "Reviews code for security vulnerabilities"
model: claude-sonnet-4-6      # optional
tools: [Read, Grep, Glob]
# Restrict or exclude targets (same semantics as instruction files)
targets: [claude-code, codex]
excludedTargets: []
# Claude Code specific
isolation: worktree            # "worktree" | null
# Codex specific
sandbox_mode: read-only        # "read-only" | "workspace-write" | "danger-full-access"
reasoning_effort: high         # "low" | "medium" | "high"
---

You are a security-focused code reviewer. Your job is to...
```

---

## `hooks/hooks.yaml` Schema (normalized event names)

```yaml
hooks:
  - name: "block-force-push"
    event: PreToolUse           # normalized name; tool translates per-agent
    matcher: "Bash"             # tool name, regex, or "*"
    type: command               # command | http | prompt | agent
    command: "./hooks/scripts/block-force-push.sh"
    timeout: 30
    blocking: true              # → exit code 2 behavior
    async: false                # Claude Code async mode
```

---

## Generation Mapping — What Goes Where (no overlap)

### `instructions/*.md` — `activation: always`

Generated directly into each agent's native always-on location. Workspace root files (`AGENTS.md`, `GEMINI.md`) are only used where no agent-specific directory exists.

| Agent | Output File | Notes |
|---|---|---|
| Copilot + Copilot CLI | `.github/copilot-instructions.md` | All always files concatenated |
| Cursor | `.cursor/rules/<name>.mdc` | `alwaysApply: true` |
| Claude Code | `.claude/CLAUDE.md` | All always files concatenated |
| Gemini CLI | `GEMINI.md` | Root file unavoidable |
| Antigravity | `.agents/rules/<name>.md` | `activation: always` |
| Codex | `AGENTS.md` | Root file unavoidable |
| Windsurf | `.windsurf/rules/<name>.md` | `trigger: always_on` |
| Cline | `.clinerules/<name>.md` | No frontmatter = always loaded |

---

### `instructions/*.md` — `activation: scoped`

`globs:` translated to each agent's frontmatter key:

| Agent | Output File | Frontmatter |
|---|---|---|
| Copilot + Copilot CLI | `.github/instructions/<name>.instructions.md` | `applyTo:` (comma-joined) |
| Cursor | `.cursor/rules/<name>.mdc` | `globs:`, `alwaysApply: false` |
| Windsurf | `.windsurf/rules/<name>.md` | `trigger: glob`, `globs:` |
| Cline | `.clinerules/<name>.md` | `paths:` list |
| Claude Code | `.claude/rules/<name>.md` | `paths:` list |
| Antigravity | `.agents/rules/<name>.md` | `activation: glob`, `glob:` (first value) |
| Gemini CLI | — | No glob-scoped rules; skipped |
| Codex | — | No glob-scoped rules; skipped |

---

### `instructions/*.md` — `activation: ai-decided`

`description:` translated per agent. Agents without a native ai-decided mechanism receive it as an always-on rule with an in-text condition prepended (e.g., `"Apply the following only when: <description>"`), so the model still self-regulates.

| Agent | Output File | Mechanism |
|---|---|---|
| Cursor | `.cursor/rules/<name>.mdc` | `description:`, `alwaysApply: false` |
| Windsurf | `.windsurf/rules/<name>.md` | `trigger: model_decision`, `description:` |
| Antigravity | `.agents/rules/<name>.md` | `activation: model`, `description:` |
| Copilot + Copilot CLI | `.github/instructions/<name>.instructions.md` | `applyTo: "**/*"` + in-text condition |
| Claude Code | `.claude/rules/<name>.md` | No `paths:` frontmatter + in-text condition |
| Gemini CLI | `GEMINI.md` | Appended with in-text condition |
| Cline | `.clinerules/<name>.md` | No frontmatter + in-text condition |
| Codex | `AGENTS.md` | Appended with in-text condition |

---

### `instructions/*.md` — `activation: manual`

Agents with a native manual-invocation mechanism use it. Agents without one receive the file in a sensible location so users can `@`-reference or `#file:`-include it manually.

| Agent | Output File | Mechanism |
|---|---|---|
| Cursor | `.cursor/rules/<name>.mdc` | No frontmatter = manual `@`-mention |
| Windsurf | `.windsurf/rules/<name>.md` | `trigger: manual` |
| Antigravity | `.agents/rules/<name>.md` | `activation: manual` |
| Copilot + Copilot CLI | `.github/prompts/<name>.prompt.md` | `#file:` reference or UI picker |
| Claude Code | `.claude/rules/<name>.md` | `paths: []` blocks auto-load; `@`-import manually |
| Gemini CLI | `.gemini/instructions/<name>.md` | Manual `@path` import |
| Cline | `.clinerules/<name>.md` | Disabled via Cline Rules panel toggle |
| Codex | `.codex/instructions/<name>.md` | Reference manually in prompt |

---

### `agents/<name>.md`

| Agent | Output |
|---|---|
| Claude Code | `.claude/agents/<name>.md` — frontmatter + body passed through directly |
| Codex | `.codex/agents/<name>.toml` — frontmatter fields mapped to TOML |

---

### `skills/<name>/`

Follows the agentskills.io standard. `.agents/skills/` is the shared path scanned natively by Copilot, Cursor, Antigravity, Codex, and Windsurf — a single copy covers all five.

| Agent | Output Path | Notes |
|---|---|---|
| Copilot + Copilot CLI | `.agents/skills/<name>/` | Copilot scans `.agents/skills/` natively |
| Cursor | `.agents/skills/<name>/` | Cursor scans `.agents/skills/` natively |
| Antigravity | `.agents/skills/<name>/` | Primary agentskills.io path |
| Codex | `.agents/skills/<name>/` | Shares path with all above |
| Windsurf | `.agents/skills/<name>/` | Windsurf scans this; no `.windsurf/skills/` generated |
| Gemini CLI | `.gemini/skills/<name>/` | Gemini-native path; does not scan `.agents/skills/` |
| Cline | `.cline/skills/<name>/` | Cline-native path |
| Claude Code | `.claude/agents/<name>.md` | Not agentskills.io; use `agents/` source or duplicate `SKILL.md` body |

---

### `commands/*.md`

Manually invoked reusable prompts and multi-step procedures. Agents with native workflow/command support use it; all others fall back to a skill with `disable-model-invocation: true` (explicit `/name` slash invocation only).

| Agent | Output Path | Mechanism |
|---|---|---|
| Copilot + Copilot CLI | `.github/prompts/<name>.prompt.md` | `#file:` reference or UI picker |
| Antigravity | `.agents/workflows/<name>.md` | `/<name>` slash command |
| Windsurf | `.windsurf/workflows/<name>.md` | `/<name>` slash command |
| Cline | `.clinerules/workflows/<name>.md` | `/<name>` slash command |
| Cursor | `.cursor/skills/<name>/` | Skill with `disable-model-invocation: true` |
| Gemini CLI | `.gemini/skills/<name>/` | Skill with `disable-model-invocation: true` |
| Codex | `.agents/skills/<name>/` | Skill with `disable-model-invocation: true` |
| Claude Code | `.claude/agents/<name>.md` | Invokable subagent (`>>name`) |

The generator strips `#file:` import syntax for non-Copilot targets. Cursor uses `.cursor/skills/` (not `.agents/skills/`) to avoid colliding with auto-invoked skills.

---

### `hooks/hooks.yaml`

Normalized event name → per-agent translation:

| Normalized | Cursor | Claude Code | Gemini CLI | Codex | Cline |
|---|---|---|---|---|---|
| `SessionStart` | `sessionStart` | `SessionStart` | `SessionStart` | `SessionStart` | `TaskStart` |
| `SessionEnd` | `sessionEnd` | `SessionEnd` | `SessionEnd` | `Stop` | `TaskComplete` |
| `PreToolUse` | `preToolUse` | `PreToolUse` | `BeforeTool` | `PreToolUse` | `PreToolUse` |
| `PostToolUse` | `postToolUse` | `PostToolUse` | `AfterTool` | `PostToolUse` | `PostToolUse` |
| `SubagentStart` | `subagentStart` | `SubagentStart` | `BeforeAgent` | — | — |
| `SubagentStop` | `subagentStop` | `SubagentStop` | `AfterAgent` | — | — |
| `PreCompact` | `preCompact` | `PreCompact` | `PreCompress` | — | `PreCompact` |
| `UserPromptSubmit` | `beforeSubmitPrompt` | `UserPromptSubmit` | — | `UserPromptSubmit` | `UserPromptSubmit` |
| `PermissionRequest` | — | `PermissionRequest` | — | `PermissionRequest` | — |

Output targets:
- Cursor → `.cursor/hooks.json`
- Claude Code → `.claude/settings.json` (hooks section)
- Gemini CLI → `.gemini/settings.json` (hooks section)
- Codex → `.codex/hooks.json` (requires `codex_hooks = true` in `~/.codex/config.toml`)
- Cline → `.clinerules/hooks/<EventName>` (no extension on macOS/Linux; `.ps1` on Windows)
- Windsurf, Copilot, Antigravity → no hooks support; skipped

---


## Further Considerations

1. **Cline hooks are scripts, not JSON**: Hook file names must exactly match the normalized event name (e.g., a file named `PreToolUse` with no extension on Linux/macOS, or `PreToolUse.ps1` on Windows). The generator needs platform-awareness or a convention for shipping multi-platform hook scripts.

2. **Codex hooks require a feature flag**: `codex_hooks = true` must be set in `~/.codex/config.toml`, and hooks are currently disabled on Windows. The generator should emit a warning when generating Codex hook files if this constraint is detected.

3. **Antigravity 12,000-char rule limit**: Each `.agents/rules/*.md` file must stay under 12,000 characters. The generator should warn or split files that exceed this.

4. **Claude Code CLAUDE.md wraps AGENTS.md**: The generated `CLAUDE.md` should contain only `@AGENTS.md` (and optionally `@.claude/CLAUDE.md` for project-specific additions) to avoid any inline duplication — Claude Code's `@file` import handles the rest.

5. **Codex fallback filenames**: Codex supports `project_doc_fallback_filenames` in `~/.codex/config.toml`. If the user has `CLAUDE.md` listed there, the generated `CLAUDE.md` would be double-loaded by Codex. The generator could warn about this.
