# Plan: `agentconfig` Tool Architecture

**TypeScript/Node.js CLI + programmatic library.** Reads `.agentconfig/` → normalized IR → per-agent generators → writes agent-native files. Also runs in reverse: scans an existing project for agent-native directive files and bootstraps a `.agentconfig/` folder from them. Generators are plugins so third parties can add new targets.

---

## Layers (pipeline order)

| # | Layer | Responsibility |
|---|---|---|
| 1 | **CLI** | Parses args, routes to core API — no business logic |
| 2 | **Core API** | Public programmatic surface (`generate`, `validate`, `diff`, `import`, `write`) |
| 3 | **Config Reader** | Loads + validates `config.yaml`; merges CLI overrides |
| 4 | **Parsers** | One parser per `.agentconfig/` source type → emits IR nodes |
| 4b | **Importers** | One importer per agent target — reverse-parses agent-native files → IR nodes |
| 5 | **IR** | Pure normalized TS types, zero agent-specific knowledge |
| 6 | **Generator Registry** | Plugin-aware registry; built-in generators self-register |
| 7 | **Built-in Generators** | 8 generators, one per target family |
| 8 | **Writer** | File I/O: overwrite logic, dry-run diff, directory creation |
| 9 | **Validator** | Schema checks, char limits, platform warnings — runs standalone |

---

## Package Structure

```
packages/
  core/    — IR types, parsers, generators, registry, writer, validator
  cli/     — commander/yargs CLI wrapping core API
plugins/   — optional community generator packages (e.g., plugin-aider)
```

---

## IR Types (key nodes)

- `InstructionFile` — `activation`, `globs`, `description`, `name`, `targets`, `excludedTargets`, `body`
- `AgentDefinition` — all `agents/*.md` frontmatter fields + body
- `Skill` — directory tree snapshot
- `Command` — name + body
- `HookDefinition` — normalized event name, type, command, timeout, blocking, async
- `IR` — root container holding all of the above

---

## Plugin API (`AgentGenerator` interface)

```ts
interface AgentGenerator {
  readonly target: string;        // e.g. "copilot", "cursor"
  readonly displayName: string;
  generate(input: GeneratorInput): FileOutput[];
}

interface FileOutput {
  path: string;    // relative to outputDir
  content: string;
}
```

Plugins register via `registry.register(generator)` or via a `plugins:` entry in `config.yaml` (loaded as Node modules). The 8 built-in generators self-register on import.

---

## Built-in Generators

| Generator | Targets |
|---|---|
| `CopilotGenerator` | `copilot`, `copilot-cli` |
| `CursorGenerator` | `cursor`, `cursor-cli` |
| `ClaudeCodeGenerator` | `claude-code` |
| `GeminiCliGenerator` | `gemini-cli` |
| `AntigravityGenerator` | `antigravity` |
| `CodexGenerator` | `codex`, `codex-cli` |
| `WindsurfGenerator` | `windsurf` |
| `ClineGenerator` | `cline` |

Each generator handles all 4 activation types for instructions, plus agents, skills, commands, and hooks (or emits a no-op for unsupported features).

---

## CLI Commands & Options

```
agentconfig generate   [--target <name>]... [--dry-run] [--watch]
agentconfig validate   [--strict] [--format text|json]
agentconfig diff       [--target <name>]...
agentconfig import     <source-dir> [--from <agent>]... [--merge]
agentconfig list-targets [--format text|json]
```

**Global flags** (all commands):
- `--config <path>` — path to `.agentconfig/` (default: auto-discover upward from CWD)
- `--project-root <path>` — output root dir (default: project root containing `.agentconfig/`)
- `--target <name>` — filter to specific targets (repeatable)
- `-v, --verbose`
- `--format <text|json>` — machine-readable output for CI

**`generate`-specific:**
- `--dry-run` — equivalent to `diff`; prints a unified diff of what would change without writing any files
- `--watch` — regenerate on change

**`diff`** — computes and prints a unified diff between the current on-disk state and what `generate` would produce; exits non-zero if any changes are pending (useful as a CI lint gate)

**`import <source-dir>`** — scans `<source-dir>` for agent-native directive files, reverse-parses them into IR, and writes a bootstrapped `.agentconfig/` folder
- `--from <agent>` — only import directives from the named agent (repeatable); default: all detected agents
- `--merge` — merge imported content into an existing `.agentconfig/` (default: error if folder already exists)

**`validate --strict`** — exits non-zero on warnings (CI gate)

---

## Validator Checks

| Check | Targets |
|---|---|
| Frontmatter schema validity | All |
| `activation:` value in allowed set | All |
| 12,000-char file limit | Antigravity, Windsurf |
| 6,000-char global / 12,000-char project limit | Cursor |
| `globs:` required when `activation: scoped` | All |
| `description:` required when `activation: ai-decided` | All |
| Codex hooks on Windows warning | Codex |
| `codex_hooks = true` feature-flag reminder | Codex |
| CLAUDE.md double-load via `project_doc_fallback_filenames` | Claude Code |

---

## Key Source Files

- `packages/core/src/types/ir.ts` — all IR types
- `packages/core/src/types/generator.ts` — `AgentGenerator`, `FileOutput`, `GeneratorInput`
- `packages/core/src/config.ts` — `config.yaml` loader
- `packages/core/src/parsers/` — `instruction.ts`, `agent.ts`, `skill.ts`, `command.ts`, `hook.ts`
- `packages/core/src/importers/` — one file per agent (`copilot.ts`, `cursor.ts`, `claude-code.ts`, etc.); each detects and reverse-parses that agent's native files into IR nodes
- `packages/core/src/importers/index.ts` — `detectAgents(dir)` probe + orchestrator
- `packages/core/src/generators/` — 8 generator files + `base.ts` shared helpers
- `packages/core/src/registry.ts` — `GeneratorRegistry`
- `packages/core/src/writer.ts` — file writing + dry-run
- `packages/core/src/validator.ts`
- `packages/core/src/index.ts` — public API surface
- `packages/cli/src/index.ts` — CLI entry point

---

## Verification

1. `agentconfig validate` exits 0 on a well-formed `.agentconfig/`
2. `agentconfig generate --dry-run` prints a unified diff and writes no files
3. `agentconfig diff` exits non-zero when generated output differs from on-disk state; exits 0 after a clean `generate`
4. `agentconfig generate` produces correct output per agent (at minimum: always + scoped instruction per target)
5. `agentconfig import <dir>` run against a project with Copilot + Cursor directives produces a valid `.agentconfig/` with matching instructions
7. Registering a custom plugin generator: appears in `list-targets` and produces files
8. A 12,001-char instruction file targeting Antigravity triggers a warning

---

## Further Considerations

1. **Import deduplication** — when importing from multiple agents simultaneously, the same logical instruction (e.g., a TypeScript coding standard) may exist in both `.github/copilot-instructions.md` and `.cursor/rules/typescript.mdc`. The importer should perform content-similarity comparison (exact match first, then normalized whitespace) and merge duplicates into a single `.agentconfig/instructions/` file rather than emitting one file per agent.

2. **Import activation inference** — agent-native files don't always carry enough metadata to unambiguously recover the original `activation` type. The importer should apply heuristics (e.g., Cursor `alwaysApply: true` → `always`, `globs:` present → `scoped`, `description:` only → `ai-decided`, no frontmatter in a Cline rule → `always`) and annotate ambiguous cases with a `# TODO: verify activation` comment in the emitted frontmatter.

3. **`base.ts` shared helpers** — The activation-type fallback logic ("ai-decided → always-on with in-text condition prefix") is identical for Gemini, Cline, Codex, and Copilot. A `BaseGenerator` abstract class or a set of utility functions in `base.ts` should implement this once and let each generator delegate to it, rather than duplicating it across four generator files.

2. **Incremental writes / cache** — `--watch` mode benefits from a content hash cache so unchanged outputs aren't re-written (avoids triggering editor "file changed" prompts on every save). Worth including in the `Writer` design from the start.

3. **Copilot + Copilot CLI treated as one target vs. two** — The plan collapses them into one generator, but a user might want to generate for only one. Consider whether `copilot` and `copilot-cli` register as separate targets that share an implementation, or whether a single `copilot` target covers both.
