# agentconfig

Write your AI agent instructions once. Generate native directive files for every agent automatically.

`agentconfig` reads a single `.agentconfig/` folder — the single source of truth for all your agent instructions, skills, commands, and hooks — and emits the correct native artifacts for each agent you target. Switch agents, add new ones, or keep a dozen in sync without touching agent-specific files by hand.

---

## Supported Agents

| Target name | Agent |
|---|---|
| `copilot` | GitHub Copilot (VS Code extension) |
| `copilot-cli` | GitHub Copilot CLI (`gh copilot`) |
| `cursor` | Cursor IDE + Cursor CLI |
| `claude-code` | Anthropic Claude Code |
| `gemini-cli` | Google Gemini CLI |
| `antigravity` | Google Antigravity |
| `codex` | OpenAI Codex (cloud + CLI) |
| `windsurf` | Windsurf (Codeium) |
| `cline` | Cline (VS Code extension) |

---

## Installation

```bash
npm install -g agentconfig
```

Or run without installing:

```bash
npx agentconfig <command>
```

---

## Development

Use Node.js 24 LTS or newer.

```bash
cd agentconfig/src
npm install
npm run build
npm test
```

Run the CLI locally without installing it globally:

```bash
node packages/cli/dist/index.js --help
```

Make the local CLI available on your PATH while developing:

```bash
cd agentconfig/src/packages/cli
npm link
agentconfig --help
```

After changing CLI or core code, rebuild from `agentconfig/src`:

```bash
npm run build
```

Remove the global development link when you are done:

```bash
npm unlink -g agentconfig-cli
```

---

## Quick Start

**New project** — create a `.agentconfig/` folder and generate:

```bash
mkdir .agentconfig
# add config.yaml and your instruction files (see below)
agentconfig generate
```

**Existing project** — bootstrap `.agentconfig/` from your current agent files:

```bash
agentconfig import .
```

---

## `.agentconfig/` Folder Structure

```
.agentconfig/
├── config.yaml                 ← targets and options
├── instructions/               ← flat list of instruction files
│   ├── 01-coding-standards.md
│   ├── typescript.md
│   ├── performance.md
│   └── migration-guide.md
├── agents/                     ← subagent / custom-agent definitions
│   └── security-reviewer.md
├── skills/                     ← agentskills.io-compatible skills
│   └── my-skill/
│       ├── SKILL.md
│       ├── scripts/
│       ├── examples/
│       └── references/
├── commands/                   ← manually invoked prompts and workflows
│   └── deploy.md
└── hooks/
    ├── hooks.yaml              ← hook definitions (normalized event names)
    └── scripts/                ← *.sh / *.ps1 implementation files
```

---

## Configuration — `config.yaml`

```yaml
version: 1
targets:
  - copilot
  - cursor
  - claude-code
  - gemini-cli
  - codex
options:
  output_dir: "."       # where generated files are written (default: project root)
```

---

## Instruction Files

Each file in `instructions/` is a Markdown file with optional YAML frontmatter. The `activation` field controls how the instruction is loaded by each agent.

```yaml
---
activation: always          # always | scoped | ai-decided | manual
---
```

If frontmatter is omitted entirely, `activation: always` is assumed.

### `activation: always`

Loaded unconditionally on every session. Emitted into each agent's native always-on location.

```markdown
---
activation: always
---

Always use `const` for variables that are never reassigned.
```

### `activation: scoped`

Loaded only when the active file matches a glob pattern.

```yaml
---
activation: scoped
globs:
  - "**/*.ts"
  - "**/*.tsx"
---
```

### `activation: ai-decided`

The model decides whether to apply the instruction based on a description. Agents with native support use their built-in mechanism; others receive the instruction with an in-text condition prefix.

```yaml
---
activation: ai-decided
description: "Apply when working with performance-critical code paths"
---
```

### `activation: manual`

Not loaded automatically. Users invoke it explicitly (`@`-mention, `#file:` reference, slash command, etc.). Agents without a native manual mechanism receive the file in a sensible location for manual reference.

```yaml
---
activation: manual
name: migration-guide       # overrides filename as the invocation slug
---
```

### Targeting Specific Agents

All instruction files accept `targets` and `excludedTargets` to restrict which agents receive the file:

```yaml
---
activation: always
targets: [copilot, cursor]
excludedTargets: [copilot-cli]
---
```

---

## Agent Definitions — `agents/<name>.md`

Define reusable subagents or custom agent configurations. Frontmatter carries the agent config; the body is the system prompt.

```markdown
---
name: security-reviewer
description: "Reviews code for security vulnerabilities"
model: claude-sonnet-4-6
tools: [Read, Grep, Glob]
targets: [claude-code, codex]
# Claude Code specific
isolation: worktree
# Codex specific
sandbox_mode: read-only
reasoning_effort: high
---

You are a security-focused code reviewer. Your job is to identify OWASP Top 10
vulnerabilities and suggest concrete fixes with minimal scope changes.
```

Agents are emitted as:
- `.claude/agents/<name>.md` for Claude Code
- `.codex/agents/<name>.toml` for Codex (frontmatter fields mapped to TOML)

---

## Hooks — `hooks/hooks.yaml`

Define lifecycle hooks using normalized event names. `agentconfig` translates them to each agent's native format.

```yaml
hooks:
  - name: "block-force-push"
    event: PreToolUse       # normalized event name
    matcher: "Bash"         # tool name, regex, or "*"
    type: command
    command: "./hooks/scripts/block-force-push.sh"
    timeout: 30
    blocking: true
    async: false
```

### Normalized Event Names

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

Hook output targets: Cursor → `.cursor/hooks.json`, Claude Code → `.claude/settings.json`, Gemini CLI → `.gemini/settings.json`, Codex → `.codex/hooks.json`, Cline → `.clinerules/hooks/<EventName>[.ps1]`. Windsurf, Copilot, and Antigravity do not support hooks and are skipped.

> **Note (Codex):** Hooks require `codex_hooks = true` in `~/.codex/config.toml` and are disabled on Windows.

> **Note (Cline):** Hook script files must be named exactly after the normalized event name — no extension on macOS/Linux, `.ps1` on Windows.

---

## Skills — `skills/<name>/`

Skills follow the [agentskills.io](https://agentskills.io) standard. A single copy in `.agents/skills/` is shared by Copilot, Cursor, Antigravity, Codex, and Windsurf natively. Agent-specific paths are generated for Gemini CLI (`.gemini/skills/`) and Cline (`.cline/skills/`).

---

## Commands — `commands/<name>.md`

Manually invoked prompts and multi-step procedures. Agents with native workflow support (Antigravity, Windsurf, Cline) receive them as slash commands. Others receive them as skills (`disable-model-invocation: true`) or prompt files.

| Agent | Output | Mechanism |
|---|---|---|
| Copilot + Copilot CLI | `.github/prompts/<name>.prompt.md` | `#file:` / UI picker |
| Antigravity | `.agents/workflows/<name>.md` | `/<name>` slash command |
| Windsurf | `.windsurf/workflows/<name>.md` | `/<name>` slash command |
| Cline | `.clinerules/workflows/<name>.md` | `/<name>` slash command |
| Cursor | `.cursor/skills/<name>/` | Skill, explicit invocation only |
| Gemini CLI | `.gemini/skills/<name>/` | Skill, explicit invocation only |
| Codex | `.agents/skills/<name>/` | Skill, explicit invocation only |
| Claude Code | `.claude/agents/<name>.md` | Invokable subagent (`>>name`) |

---

## CLI Commands

### `agentconfig generate`

Read `.agentconfig/` and write all agent-native files.

```bash
agentconfig generate
agentconfig generate --target copilot --target cursor
agentconfig generate --watch            # regenerate on change
```

### `agentconfig validate`

Check `.agentconfig/` for schema errors, missing required fields, and agent-specific constraint violations (character limits, platform warnings, etc.).

```bash
agentconfig validate
agentconfig validate --strict           # exit non-zero on warnings (CI gate)
agentconfig validate --format json      # machine-readable output
```

Checks include:

- `activation:` value in the allowed set
- `globs:` required when `activation: scoped`
- `description:` required when `activation: ai-decided`
- File character limits (Antigravity/Windsurf: 12,000; Cursor: 6,000 global / 12,000 project)
- Codex hooks disabled on Windows
- `codex_hooks = true` feature flag reminder
- Potential `CLAUDE.md` double-load via Codex `project_doc_fallback_filenames`

### `agentconfig diff`

Print a unified diff between the current on-disk state and what `generate` would produce. Exits non-zero if any changes are pending — useful as a CI lint step to enforce that generated files are always committed and up to date.

```bash
agentconfig diff
agentconfig diff --target cursor
```

### `agentconfig import`

Scan an existing project directory for agent-native directive files, reverse-parse them into the normalized IR, and write a bootstrapped `.agentconfig/` folder. Useful for migrating an existing project onto `agentconfig`.

```bash
agentconfig import .                    # scan current directory, detect all agents
agentconfig import . --from copilot --from cursor   # only import from these agents
agentconfig import . --merge            # merge into an existing .agentconfig/
```

When multiple agents contain the same logical instruction, the importer merges them into a single file using content-similarity comparison. Ambiguous `activation` types are inferred from each agent's frontmatter and annotated with `# TODO: verify activation` when the heuristic is uncertain.

### `agentconfig list-targets`

List all registered targets (built-in and plugin).

```bash
agentconfig list-targets
agentconfig list-targets --format json
```

---

## Global Options

All commands accept these flags:

| Flag | Description |
|---|---|
| `--config <path>` | Path to `.agentconfig/` directory. Default: auto-discovered upward from CWD. |
| `--project-root <path>` | Output root directory. Default: project root containing `.agentconfig/`. |
| `--target <name>` | Restrict to one target (repeatable). |
| `-v, --verbose` | Verbose logging. |
| `--format <text\|json>` | Output format (default: `text`). |

---

## Programmatic API

```ts
import { loadConfig, parseArtifacts, generate, write, validate } from 'agentconfig';

const config = await loadConfig('.agentconfig');
const ir     = await parseArtifacts('.agentconfig', config);
const errors = validate(ir, config);
const files  = generate(ir, config);
await write(files, { outputDir: '.' });
```

---

## Plugin API

Add support for a new agent by implementing the `AgentGenerator` interface and registering it.

```ts
import { AgentGenerator, GeneratorInput, FileOutput, registry } from 'agentconfig/core';

const myGenerator: AgentGenerator = {
  target: 'my-agent',
  displayName: 'My Agent',
  generate(input: GeneratorInput): FileOutput[] {
    return input.ir.instructions.map(inst => ({
      path: `.myagent/rules/${inst.name}.md`,
      content: inst.body,
    }));
  },
};

registry.register(myGenerator);
```

Plugins can also be loaded automatically by listing them in `config.yaml`:

```yaml
plugins:
  - agentconfig-plugin-aider
  - ./local-plugins/my-agent.js
```

---

## CI Integration

Add a `diff` step to your pipeline to catch un-regenerated files:

```yaml
# GitHub Actions example
- name: Check agentconfig is up to date
  run: npx agentconfig diff
```

Use `validate --strict` to fail the pipeline on any configuration warnings:

```yaml
- name: Validate agentconfig
  run: npx agentconfig validate --strict
```

---

## License

MIT
