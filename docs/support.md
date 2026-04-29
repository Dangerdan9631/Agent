# Coding Agent Directive Files Support

> Researched from official documentation, July 2025.

## Tools

| Tool | Type | Description |
|------|------|-------------|
| **Cursor** | IDE | Cursor IDE — [cursor.com](https://cursor.com) |
| **Cursor CLI** | CLI | Cursor terminal agent — `curl https://cursor.com/install \| bash` |
| **Copilot** | IDE extension | GitHub Copilot in VS Code — [github.com/features/copilot](https://github.com/features/copilot) |
| **Copilot CLI** | CLI | GitHub Copilot CLI — `gh copilot` |
| **Claude Code** | CLI | Anthropic Claude Code — `claude` command |
| **Gemini CLI** | CLI | Google Gemini CLI — `gemini` command |
| **Antigravity** | IDE | Google Antigravity IDE — [antigravity.google](https://antigravity.google) |
| **Codex** | Web/app | OpenAI Codex (ChatGPT-integrated coding agent) |
| **Codex CLI** | CLI | OpenAI Codex CLI — `codex` command |
| **Windsurf** | IDE | Windsurf (Codeium) — [windsurf.com](https://windsurf.com) |
| **Windsurf CLI** | CLI | Windsurf terminal agent (Devin for Terminal) — `devin` command — [cli.windsurf.com](https://cli.windsurf.com) |
| **Cline** | IDE extension | Cline VS Code extension — [cline.bot](https://cline.bot) |


---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Supported |
| ❌ | Not supported |
| ⚠️ | Partial / off by default / limited |
| 🔧 | Requires explicit configuration |
| ❓ | Not documented / unclear |

---

## Support Matrix

> **Row definitions:**
> - **Global instructions** — Per-user instructions that apply across all projects (home directory or app settings)
> - **Workspace instructions** — Project-scoped instructions in a dedicated subdirectory (e.g. `.cursor/rules/`, `.github/`)
> - **Workspace root instructions** — A single instruction file placed directly in the project root (e.g. `./CLAUDE.md`)
> - **Nested instructions** — Instruction files inside subdirectories, loaded in addition to root instructions
> - **Pathed/globbed instructions** — Instructions automatically applied to files matching a glob pattern
> - **Root AGENTS.md** — The `AGENTS.md` file at the repository root
> - **Nested AGENTS.md** — `AGENTS.md` files in subdirectories
> - **`.agents/rules`** — The `.agents/rules/` directory convention as a workspace rules store
> - **`@file.md` imports** — Syntax for importing/including another file within an instruction file
> - **Skills** — Native support for the [agentskills.io](https://agentskills.io) `SKILL.md` standard
> - **`.agent/skills`** — The `.agent/skills/` directory (singular — legacy/older path)
> - **Global skills** — User-home-level skills applying across all projects
> - **Subagents** — Spawning or delegating work to named sub-agents
> - **Hooks** — Lifecycle shell commands, HTTP endpoints, or LLM callbacks that fire at specific agent loop events (e.g. pre/post tool use, session start/end, compaction)
> - **`AGENTS.md` standard** — Whether the tool natively supports `AGENTS.md` as a first-class instruction filename without requiring additional configuration
> - **`agentskills.io` standard** — Whether the tool natively implements the open [agentskills.io](https://agentskills.io) `SKILL.md` standard for portable, cross-tool skills

| Feature | Cursor | Cursor CLI | Copilot | Copilot CLI | Claude Code | Gemini CLI | Antigravity | Codex | Codex CLI | Windsurf | Windsurf CLI | Cline |
|---------|--------|------------|---------|-------------|-------------|------------|-------------|-------|-----------|----------|-------------|-------|
| **Global instructions** | ✅ User Rules (UI, not file-based) | ✅ Same as IDE | ⚠️ GitHub.com profile only | ❌ | ✅ `~/.claude/CLAUDE.md` | ✅ `~/.gemini/GEMINI.md` | ✅ `~/.gemini/GEMINI.md` | ✅ `~/.codex/AGENTS.md` | ✅ `~/.codex/AGENTS.md` | ✅ `~/.codeium/windsurf/memories/global_rules.md` | ✅ `~/.codeium/windsurf/memories/global_rules.md` (via windsurf import) | ✅ VS Code settings |
| **Workspace instructions** | ✅ `.cursor/rules/*.mdc` | ✅ `.cursor/rules/*.mdc` | ✅ `.github/copilot-instructions.md` | ✅ `.github/copilot-instructions.md` | ✅ `.claude/CLAUDE.md` | ✅ `./GEMINI.md` (hierarchy) | ✅ `.agents/rules/` | ✅ `.codex/` + `AGENTS.md` | ✅ `.codex/` + `AGENTS.md` | ✅ `.windsurf/rules/*.md` | ✅ `.windsurf/rules/*.md` (imported) | ✅ `.clinerules` or `.clinerules/` |
| **Workspace root instructions** | ❌ | ❌ | ❌ | ❌ | ✅ `./CLAUDE.md` | ✅ `./GEMINI.md` | ❌ | ✅ `./AGENTS.md` | ✅ `./AGENTS.md` | ❌ | ✅ `AGENTS.md` / `AGENT.md` / `CLAUDE.md` | ✅ `.clinerules` |
| **Nested instructions** | ✅ AGENTS.md in subdirs | ✅ AGENTS.md in subdirs | ⚠️ AGENTS.md (off by default) | ❌ | ✅ CLAUDE.md hierarchy | ✅ JIT-loaded GEMINI.md | ❓ | ✅ AGENTS.md root→CWD | ✅ AGENTS.md root→CWD | ❓ | ✅ AGENTS.md lazily loaded | ❌ |
| **Pathed/globbed instructions** | ✅ `globs:` frontmatter | ✅ `globs:` frontmatter | ✅ `applyTo:` frontmatter | ✅ `applyTo:` frontmatter | ✅ `paths:` in `.claude/rules/` | ❌ | ✅ Glob activation mode | ❌ | ❌ | ✅ `glob` activation mode | ✅ windsurf `glob` trigger (via import) | ✅ `paths:` frontmatter |
| **Root AGENTS.md** | ✅ | ✅ | ✅ | ✅ | ✅ via `@AGENTS.md` import | 🔧 `context.fileName` config | ❓ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Nested AGENTS.md** | ✅ | ✅ | ⚠️ Off by default | ❌ | ✅ via `@` import | 🔧 `context.fileName` config | ❓ | ✅ | ✅ | ✅ auto-glob scoped | ✅ lazily loaded | ❓ |
| **`.agents/rules`** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Native (primary location) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`@file.md` imports** | ❌ | ❌ | ❌ | ❌ | ✅ `@path/to/file` (5-hop depth) | ✅ `@path/to/file.md` | ✅ `@filename` | ❌ | ❌ | ❓ | ❌ | ❌ |
| **Skills** | ✅ `.agents/skills/`, `.cursor/skills/` | ✅ Same as IDE | ✅ `.github/skills/`, `.agents/skills/` | ✅ `.github/skills/`, `.agents/skills/` | ✅ `.claude/agents/` | ✅ `.gemini/skills/` | ✅ `.agents/skills/` | ✅ `.agents/skills/` | ✅ `.agents/skills/` | ✅ `.windsurf/skills/` | ✅ `.agents/skills/`, `.devin/skills/`, `.windsurf/skills/` | ✅ `.cline/skills/` (native) |
| **`.agent/skills`** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Legacy compat | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Global skills** | ✅ `~/.agents/skills/`, `~/.cursor/skills/` | ✅ Same as IDE | ✅ `~/.copilot/skills/` | ✅ `~/.copilot/skills/` | ✅ `~/.claude/agents/` | ✅ `~/.gemini/skills/` | ✅ `~/.gemini/antigravity/skills/` | ✅ `$HOME/.agents/skills/` | ✅ `$HOME/.agents/skills/` | ❓ | ✅ `~/.config/devin/skills/` | ❓ |
| **Subagents** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ (experimental) | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Hooks** | ✅ `hooks.json` (command+prompt) | ✅ Same as IDE | ❌ | ❌ | ✅ `settings.json` (command/http/prompt/agent) | ✅ `settings.json` (command) | ❌ | 🔧 `hooks.json` (⚠️ Win disabled) | 🔧 `hooks.json` (⚠️ Win disabled) | ✅ `.windsurf/hooks.json` (command) | ✅ `.devin/hooks.v1.json` (command+prompt) | ✅ `hooks.json` |
| **`AGENTS.md` standard** | ✅ root+nested | ✅ root+nested | ✅ root, ⚠️ nested off by default | ✅ root only | 🔧 via `@AGENTS.md` import | 🔧 `context.fileName` config | ❓ | ✅ native | ✅ native | ✅ native | ✅ native root+nested | ✅ official |
| **`agentskills.io` standard** | ✅ `.agents/skills/` | ✅ `.agents/skills/` | ✅ `.github/skills/`, `.agents/skills/` | ✅ `.github/skills/`, `.agents/skills/` | ❌ proprietary `.claude/agents/` | ✅ `.gemini/skills/` | ✅ `.agents/skills/` | ✅ `.agents/skills/` | ✅ `.agents/skills/` | ✅ `.windsurf/skills/` | ✅ `.agents/skills/` | ❌ native only |

---

## Tool Notes

### Cursor

- **Global instructions**: Stored as plain text in *Cursor Settings → Rules for AI* (UI field, not a file on disk). Applied globally to all projects.
- **Project Rules**: `.cursor/rules/*.mdc` (or `.md`) are version-controlled, per-project rules. Each file supports YAML frontmatter:
  - `alwaysApply: true` — always included in context
  - `description:` — AI-decided (model decides whether to include)
  - `globs:` — file-pattern scoped (e.g. `src/**/*.ts`)
  - No frontmatter / manual — only included when explicitly @-mentioned
- **AGENTS.md**: Supported as an alternative to `.cursor/rules/` (root and nested).
- **Skills**: Follow the [agentskills.io](https://agentskills.io) open standard. Discovered from `.agents/skills/` and `.cursor/skills/` (project), and `~/.agents/skills/` and `~/.cursor/skills/` (user global). For cross-tool compatibility, also loads from `.claude/skills/`, `.codex/skills/`, `~/.claude/skills/`, and `~/.codex/skills/`. The agent automatically invokes skills based on description relevance; use `/skill-name` for explicit invocation. Convert existing dynamic rules and slash commands using the built-in `/migrate-to-skills` skill (Cursor 2.4+).
- **Subagents**: No native subagent file system.
- **Sources**: [cursor.com/docs/context/rules](https://cursor.com/docs/context/rules), [cursor.com/docs/skills](https://cursor.com/docs/skills)
- **Hooks**: `~/.cursor/hooks.json` (user-global) or `<project>/.cursor/hooks.json` (project-scoped). Enterprise distribution via Cursor dashboard; MDM paths: macOS `/Library/Application Support/Cursor/hooks.json`, Linux/WSL `/etc/cursor/hooks.json`, Windows `C:\ProgramData\Cursor\hooks.json`. Priority: Enterprise → Team → Project → User.
  - **Types**: `command` (shell scripts receiving JSON on stdin) and `prompt` (LLM-evaluated natural-language conditions).
  - **Agent events**: `sessionStart`, `sessionEnd`, `preToolUse`, `postToolUse`, `postToolUseFailure`, `subagentStart`, `subagentStop`, `beforeShellExecution`, `afterShellExecution`, `beforeMCPExecution`, `afterMCPExecution`, `beforeReadFile`, `afterFileEdit`, `beforeSubmitPrompt`, `preCompact`, `stop`, `afterAgentResponse`, `afterAgentThought`.
  - **Tab/inline events**: `beforeTabFileRead`, `afterTabFileEdit`.
  - Exit code 2 blocks the triggering action; exit 0 with JSON for structured control. Compatible with Claude Code hooks format.
  - **Sources**: [cursor.com/docs/hooks](https://cursor.com/docs/hooks)

---

### Cursor CLI

- Terminal agent installed via `curl https://cursor.com/install | bash` (macOS/Linux/WSL) or PowerShell equivalent (Windows).
- Uses the same underlying agent as the Cursor IDE; reads the same `.cursor/rules/` files from the working directory.
- Global User Rules from Cursor Settings are accessible since the CLI uses the same user configuration.
- **Sources**: [cursor.com/docs/cli/overview](https://cursor.com/docs/cli/overview)
- **Hooks**: Same as Cursor IDE — the CLI uses the same agent and reads the same `hooks.json` configuration from user home and the working directory.

---

### Copilot (VS Code)

- **Repository-wide instructions**: `.github/copilot-instructions.md` — applies to all Copilot requests in the repo.
- **Path-specific instructions**: `.github/instructions/**/*.instructions.md` with `applyTo:` glob frontmatter. Both Copilot Chat and cloud agent use these.
- **AGENTS.md**: Supported in VS Code. Also accepts `CLAUDE.md` and `GEMINI.md` (cloud agent). Nested AGENTS.md is **off by default** — enable via VS Code settings (`github.copilot.chat.agentsMd.enabled` or similar).
- **Personal instructions** (set on GitHub.com profile) and **Organization instructions** are not available within the VS Code extension itself.
- **Prompt files**: `.github/prompts/*.prompt.md` (preview feature) — reusable prompt snippets that support `#file:path` references; not the same as instruction files.
- **Skills**: Follow the [agentskills.io](https://agentskills.io) open standard. Scans `.github/skills/` (project) and `~/.copilot/skills/` (user global). Also scans `.claude/skills/` and `.agents/skills/` for cross-tool compatibility. The agent automatically invokes skills based on description relevance. Use `gh skill` (GitHub CLI 2.90+) to search, install, update, and publish skills. Frontmatter: `name` (required), `description` (required), `allowed-tools` (optional — pre-approve `shell`/`bash` with caution), `license` (optional).
- **Sources**: [docs.github.com/en/copilot/reference/custom-instructions-support](https://docs.github.com/en/copilot/reference/custom-instructions-support), [docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills)
- **Hooks**: No hooks support. GitHub Copilot has no lifecycle hook system.

---

### Copilot CLI

- Supports repository-wide instructions (`.github/copilot-instructions.md`), path-specific instructions (`.github/instructions/**/*.instructions.md`), and a root `AGENTS.md`.
- Nested AGENTS.md is not mentioned in the CLI documentation.
- **Sources**: [docs.github.com/en/copilot/reference/custom-instructions-support#copilot-cli](https://docs.github.com/en/copilot/reference/custom-instructions-support#copilot-cli)
- **Hooks**: No hooks support. `gh copilot` has no hook system.

---

### Claude Code

- **Instruction hierarchy** (highest to lowest precedence):
  1. Managed/enterprise policy: `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS) / `/etc/claude-code/CLAUDE.md` (Linux)
  2. User global: `~/.claude/CLAUDE.md`
  3. Project: `./CLAUDE.md` or `./.claude/CLAUDE.md`
  4. Local (gitignored): `./CLAUDE.local.md`
- Walks the directory tree upward, loading all `CLAUDE.md` files found between CWD and home/root.
- **Pathed rules**: `.claude/rules/*.md` files with `paths:` frontmatter for glob-scoped instructions.
- **`@path/to/file` imports**: Supported in any CLAUDE.md; resolves relative or absolute paths; max 5 import hops. Use `@AGENTS.md` to incorporate an AGENTS.md file.
- **Skills / Subagents**: `.claude/agents/*.md` (project-scoped) and `~/.claude/agents/*.md` (user-global). Invoked in chat with `>>agent-name`.
- **Sources**: [docs.anthropic.com/en/docs/claude-code/memory](https://docs.anthropic.com/en/docs/claude-code/memory)
- **Hooks**: `hooks` key in settings JSON. Scopes (highest to lowest): managed policy → plugin `hooks/hooks.json` → project `.claude/settings.json` → local `.claude/settings.local.json` → user `~/.claude/settings.json`. Hooks can also be declared in skill and subagent frontmatter, scoped to the component’s lifetime.
  - **Types**: `command` (shell, supports `async`/`asyncRewake`), `http` (POST endpoint), `prompt` (single-turn LLM decision), `agent` (multi-turn subagent verifier with tool access). PowerShell supported via `"shell": "powershell"` per hook.
  - **Events**: `SessionStart`, `InstructionsLoaded`, `UserPromptSubmit`, `UserPromptExpansion`, `PreToolUse`, `PermissionRequest`, `PermissionDenied`, `PostToolUse`, `PostToolUseFailure`, `Notification`, `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `Stop`, `StopFailure`, `TeammateIdle`, `ConfigChange`, `CwdChanged`, `FileChanged`, `WorktreeCreate`, `WorktreeRemove`, `PreCompact`, `PostCompact`, `SessionEnd`, `Elicitation`, `ElicitationResult`.
  - Exit code 2 blocks where supported; exit 0 with JSON for structured decisions. Settings: `disableAllHooks`, `allowManagedHooksOnly`.
  - `/hooks` menu in interactive mode for browsing all configured hooks.
  - **Sources**: [code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks)

---

### Gemini CLI

- **Instruction hierarchy**:
  1. Global: `~/.gemini/GEMINI.md` (all projects)
  2. Parent directories: walks up from CWD to `.git` root or home, loading `GEMINI.md` at each level
  3. Workspace root: `./GEMINI.md`
  4. Subdirectories: `GEMINI.md` files loaded on-demand (JIT) when Gemini accesses files in that directory
- **`@path/to/file.md` imports**: Supported within any GEMINI.md file.
- **AGENTS.md**: Not read natively; requires setting `context.fileName` to include `AGENTS.md` as an alternate context filename.
- **Skills**: Requires `skills.enabled: true` in config (`~/.gemini/config.json`). Skill files live in `.gemini/skills/<skill-folder>/SKILL.md` (project) or `~/.gemini/skills/<skill-folder>/SKILL.md` (user global).
- **Subagents**: Experimental. Enable with `experimental.enableAgents: true` in config.
- **Sources**: [geminicli.com/docs/cli/gemini-md](https://www.geminicli.com/docs/cli/gemini-md), [geminicli.com/docs/reference/configuration](https://www.geminicli.com/docs/reference/configuration)
- **Hooks**: `hooks` key in `settings.json`. Scopes: project (`.gemini/settings.json`), user (`~/.gemini/settings.json`), system (`/etc/gemini-cli/settings.json`), or installed extensions.
  - **Types**: `command` only.
  - **Events**: `SessionStart`, `SessionEnd`, `BeforeAgent`, `AfterAgent`, `BeforeModel`, `AfterModel`, `BeforeToolSelection`, `BeforeTool`, `AfterTool`, `PreCompress`, `Notification`.
  - Matchers: regex for tool events (`BeforeTool`, `AfterTool`), exact string for lifecycle events, `"*"` or `""` for all. Stdout must be strict JSON; use stderr for debugging.
  - Exit code 0 = success; exit code 2 = critical block; other = non-blocking warning.
  - `/hooks` panel for interactive management (`/hooks enable-all`, `/hooks disable-all`, `/hooks enable <name>`, `/hooks disable <name>`).
  - **Sources**: [geminicli.com/docs/hooks](https://geminicli.com/docs/hooks)

---

### Antigravity (Google)

- A standalone agent-first IDE from Google at [antigravity.google](https://antigravity.google).
- **Global rules**: `~/.gemini/GEMINI.md` — same global file as Gemini CLI.
- **Workspace rules**: `.agents/rules/` directory (current). `.agent/rules/` (singular) is still supported for backward compatibility.
- Each rule file supports four **activation modes**:
  - *Always On* — automatically included in every conversation
  - *Manual* — only when @-mentioned in the input
  - *Model Decision* — model decides based on the rule's description
  - *Glob* — applied when the active file matches a specified pattern (e.g. `**/*.ts`)
- **`@filename` imports**: Supported within rule files; relative paths resolve relative to the rule file, absolute paths resolve as true absolute or workspace-relative.
- **Skills**: Follow the [agentskills.io open standard](https://agentskills.io). Stored in `<workspace-root>/.agents/skills/<skill-folder>/SKILL.md` (project) or `~/.gemini/antigravity/skills/<skill-folder>/` (user global). `.agent/skills` (singular) is still supported for backward compatibility.
- **Subagents**: Browser Subagent is documented; additional subagent types visible in docs sidebar.
- **AGENTS.md**: Not explicitly documented in official Antigravity docs; community tools use AGENTS.md as a bootstrap file alongside `.agents/rules/`.
- **Sources**: [antigravity.google/docs/rules-workflows](https://antigravity.google/docs/rules-workflows), [antigravity.google/docs/skills](https://antigravity.google/docs/skills)
- **Hooks**: No hooks support. Antigravity has no lifecycle hook system.

---

### Codex / Codex CLI

- **Codex** is OpenAI's cloud-based coding agent (ChatGPT Plus/Pro/Business/Enterprise). **Codex CLI** is the `codex` terminal command. Both share the same directive file system.
- **AGENTS.md discovery order** (once per run):
  1. Global: `~/.codex/AGENTS.override.md` → `~/.codex/AGENTS.md` (first non-empty wins)
  2. Project: walks from Git root down to CWD, loading one file per directory (`AGENTS.override.md` takes precedence over `AGENTS.md`)
  3. Files are concatenated root-first; lower directories override earlier guidance
- **Custom filenames**: `project_doc_fallback_filenames` in `~/.codex/config.toml` lets Codex treat alternate filenames (e.g. `CLAUDE.md`, `TEAM_GUIDE.md`) as instruction files.
- **Skills** follow the [agentskills.io open standard](https://agentskills.io):
  - Project: Codex scans `.agents/skills/` from CWD up to the repository root (one level at a time)
  - User global: `$HOME/.agents/skills/`
  - Admin/system: `/etc/codex/skills/`
- **`.codex/rules/`**: Exists but is for *shell command execution rules* (allow/block/prompt specific CLI commands), **not** instruction/context files.
- **Subagents**: Full support. Custom agents defined as TOML files in `.codex/agents/` (project) or `~/.codex/agents/` (user). Built-in agents: `default`, `worker`, `explorer`.
- **Sources**: [developers.openai.com/codex/guides/agents-md](https://developers.openai.com/codex/guides/agents-md), [developers.openai.com/codex/skills](https://developers.openai.com/codex/skills), [developers.openai.com/codex/subagents](https://developers.openai.com/codex/subagents)
- **Hooks**: `hooks.json` at `~/.codex/hooks.json` (global) or `<repo>/.codex/hooks.json` (project). Requires feature flag `[features] codex_hooks = true` in `~/.codex/config.toml`. **Currently disabled on Windows.**
  - **Types**: `command` only.
  - **Events**: `SessionStart`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `UserPromptSubmit`, `Stop`.
  - Matchers: regex on tool name (currently only `Bash` emitted for tool events), or start source (`startup|resume`) for `SessionStart`. Multiple matching hook files all load; matching hooks run concurrently.
  - Input: JSON on stdin with `session_id`, `cwd`, `hook_event_name`, `model`, `transcript_path`. Exit code 2 for blocking/feedback; JSON on stdout for structured output.
  - **Sources**: [developers.openai.com/codex/hooks](https://developers.openai.com/codex/hooks)

---

### Windsurf

- **Site**: [windsurf.com](https://windsurf.com) (by Codeium)
- **Project rules**: `.windsurf/rules/*.md` — YAML frontmatter with four activation modes: `always_on`, `model_decision`, `glob`, `manual`.
- **Global instructions**: `~/.codeium/windsurf/memories/global_rules.md` (also configurable via Settings UI).
- **AGENTS.md**: Natively supported. Root-level `AGENTS.md` is always-on; subdirectory `AGENTS.md` files are auto-scoped as glob rules for files in that directory tree.
- **Skills**: `.windsurf/skills/<skill-folder>/SKILL.md` — follows the agentskills.io open standard. Also scans `.agents/skills/` for cross-tool compatibility.
- **Workflows**: `.windsurf/workflows/*.md` — manual-only via `/workflow-name` slash commands.
- **Memories**: Auto-generated per workspace in `~/.codeium/windsurf/memories/` — not committed to repo.
- **Hooks**: ✅ Cascade Hooks — launched in Wave 13 (stable Dec 2025). Config at `.windsurf/hooks.json` (workspace), `~/.codeium/windsurf/hooks.json` (user), system-level paths (macOS `/Library/Application Support/Windsurf/hooks.json`, Linux `/etc/windsurf/hooks.json`, Windows `C:\ProgramData\Windsurf\hooks.json`). `command` type only (optional `powershell` field for Windows cross-platform support). 12 events: `pre_read_code`, `post_read_code`, `pre_write_code`, `post_write_code`, `pre_run_command`, `post_run_command`, `pre_mcp_tool_use`, `post_mcp_tool_use`, `pre_user_prompt`, `post_cascade_response`, `post_cascade_response_with_transcript`, `post_setup_worktree`. Exit code 2 blocks pre-hooks. Enterprise: cloud dashboard config or MDM system-level deployment.
- **Sources**: [docs.windsurf.com](https://docs.windsurf.com), [docs.windsurf.com/windsurf/cascade/hooks](https://docs.windsurf.com/windsurf/cascade/hooks)

---

### Windsurf CLI

- **Site**: [cli.windsurf.com](https://cli.windsurf.com) — "Devin for Terminal", local CLI coding agent included with Windsurf Pro/Max/Teams subscriptions.
- **Command**: `devin` (installed via `curl -fsSL https://cli.devin.ai/install.sh | bash`; Windows installer also available)
- **Native rules**: `AGENTS.md`, `AGENT.md`, `CLAUDE.md` at project root (always-on) and subdirectories (lazily loaded when the agent accesses that directory's files). Cannot be disabled.
- **Imported rules**: Reads `.windsurf/rules/*.md` (Windsurf IDE format), `.cursor/rules/*.md` (Cursor format), and `.claude/` directory by default. Controlled via `read_config_from` in config.
- **Global instructions**: `~/.codeium/windsurf/memories/global_rules.md` (via Windsurf import).
- **Skills**: `.devin/skills/`, `.windsurf/skills/`, `.agents/skills/` (project); `~/.config/devin/skills/`, `~/.codeium/<channel>/skills/`, `~/.agents/skills/` (global, where `<channel>` is `windsurf`, `windsurf-next`, or `windsurf-insiders`). Windows global path: `%APPDATA%\devin\skills\`. Supports agentskills.io standard.
- **Subagents**: ✅ Built-in (`subagent_explore` read-only, `subagent_general` full access) and custom (`.devin/agents/<profile>/AGENT.md`). Foreground and background modes. Also imports `.claude/agents/*.md`.
- **Hooks**: `.devin/hooks.v1.json` (project, recommended) or `"hooks"` key in `.devin/config.json`. Also reads Claude Code-format hooks from `.claude/settings.json`. Claude Code-compatible format: `command` and `prompt` types. Events: `PreToolUse`, `PostToolUse`, `PermissionRequest`, `UserPromptSubmit`, `Stop`, `SessionStart`, `SessionEnd`. Exit code 2 blocks pre-hooks. Use `/hooks` in REPL to list loaded hooks.
- **Config**: `.devin/config.json` (project), `~/.config/devin/config.json` (user, or `%APPDATA%\devin\config.json` on Windows), `.devin/config.local.json` (local overrides, gitignored).
- **Sources**: [cli.windsurf.com](https://cli.windsurf.com)

---

### Cline

- **Site**: [cline.bot](https://cline.bot) — open-source VS Code extension
- **Project rules**: `.clinerules` (single file) or `.clinerules/` (directory of `.md` files). YAML frontmatter with `paths:` glob for scoped rules.
- **Global instructions**: VS Code settings (custom instructions field).
- **AGENTS.md**: Officially supported as a cross-tool instruction format.
- **Skills**: Native `.cline/skills/` system (own format); does not implement the agentskills.io standard.
- **Memory Bank**: Convention of named context files (`projectbrief.md`, `systemPatterns.md`, etc.) in `.clinerules/` for persistent project context.
- **Hooks**: `hooks.json` — supports `PreToolUse`, `PostToolUse`, `TaskStart`, and more event types.
- **Sources**: [docs.cline.bot](https://docs.cline.bot)

---

## Paths Quick Reference

| Path | Tool | Scope |
|------|------|-------|
| `~/.claude/CLAUDE.md` | Claude Code | User global instructions |
| `~/.claude/agents/` | Claude Code | User global subagents/skills |
| `.claude/CLAUDE.md` | Claude Code | Project instructions |
| `.claude/rules/*.md` | Claude Code | Project pathed/globbed rules |
| `.claude/agents/` | Claude Code | Project subagents/skills |
| `~/.gemini/GEMINI.md` | Gemini CLI, Antigravity | User global instructions |
| `~/.gemini/skills/` | Gemini CLI | User global skills |
| `~/.gemini/antigravity/skills/` | Antigravity | User global skills |
| `./GEMINI.md` | Gemini CLI | Project root instructions |
| `.gemini/skills/` | Gemini CLI | Project skills |
| `.agents/rules/` | Antigravity | Project workspace rules |
| `.agent/rules/` | Antigravity | Project workspace rules (legacy) |
| `.agents/skills/` | Antigravity, Codex, Codex CLI | Project skills |
| `.agent/skills/` | Antigravity | Project skills (legacy) |
| `~/.codex/AGENTS.md` | Codex, Codex CLI | User global instructions |
| `~/.codex/agents/` | Codex, Codex CLI | User global custom agents |
| `.codex/agents/` | Codex, Codex CLI | Project custom agents |
| `.codex/rules/` | Codex, Codex CLI | Shell command execution rules (not instructions) |
| `$HOME/.agents/skills/` | Codex, Codex CLI | User global skills |
| `/etc/codex/skills/` | Codex CLI | Admin/system skills |
| `./AGENTS.md` | Codex, Codex CLI, Cursor, Copilot | Project root instructions |
| `./CLAUDE.md` | Claude Code | Project root instructions |
| `.cursor/rules/*.mdc` | Cursor, Cursor CLI | Project rules |
| `.cursor/skills/` | Cursor, Cursor CLI | Project skills (agentskills.io) |
| `~/.cursor/skills/` | Cursor, Cursor CLI | User global skills |
| `.github/copilot-instructions.md` | Copilot, Copilot CLI | Repository-wide instructions |
| `.github/instructions/**/*.instructions.md` | Copilot, Copilot CLI | Path-specific instructions |
| `.github/skills/` | Copilot, Copilot CLI | Project skills (agentskills.io) |
| `~/.copilot/skills/` | Copilot, Copilot CLI | User global skills |
| `~/.cursor/hooks.json` | Cursor, Cursor CLI | User global hooks |
| `.cursor/hooks.json` | Cursor, Cursor CLI | Project hooks |
| `~/.claude/settings.json` (`hooks` key) | Claude Code | User global hooks |
| `.claude/settings.json` (`hooks` key) | Claude Code | Project hooks |
| `.claude/settings.local.json` (`hooks` key) | Claude Code | Project local hooks (gitignored) |
| `~/.gemini/settings.json` (`hooks` key) | Gemini CLI | User global hooks |
| `.gemini/settings.json` (`hooks` key) | Gemini CLI | Project hooks |
| `~/.codex/hooks.json` | Codex, Codex CLI | User global hooks (feature flag required) |
| `.codex/hooks.json` | Codex, Codex CLI | Project hooks (feature flag required, Windows disabled) |
| `~/.codeium/windsurf/memories/global_rules.md` | Windsurf, Windsurf CLI | User global instructions |
| `.windsurf/rules/*.md` | Windsurf, Windsurf CLI | Project rules |
| `.windsurf/skills/` | Windsurf, Windsurf CLI | Project skills (agentskills.io) |
| `.windsurf/workflows/*.md` | Windsurf | Project workflows |
| `.windsurf/hooks.json` | Windsurf | Project hooks (Cascade Hooks) |
| `~/.codeium/windsurf/hooks.json` | Windsurf | User global hooks |
| `.devin/hooks.v1.json` | Windsurf CLI | Project hooks (Claude Code-compatible) |
| `.devin/config.json` | Windsurf CLI | Project config (MCP, permissions, imports) |
| `.devin/skills/` | Windsurf CLI | Project skills (native) |
| `.devin/agents/` | Windsurf CLI | Project custom subagent profiles |
| `~/.config/devin/config.json` | Windsurf CLI | User config (`%APPDATA%\devin\config.json` on Windows) |
| `~/.config/devin/skills/` | Windsurf CLI | User global skills (`%APPDATA%\devin\skills\` on Windows) |
| `.agents/skills/` | Copilot, Copilot CLI, Cursor, Cursor CLI, Windsurf, Windsurf CLI, Antigravity, Codex, Codex CLI | Project skills (cross-tool) |
| `.clinerules` | Cline | Project rules (single file) |
| `.clinerules/` | Cline | Project rules (directory) |
| `.cline/skills/` | Cline | Project skills (native) |

