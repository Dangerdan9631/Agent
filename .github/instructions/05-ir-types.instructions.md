---
applyTo: agentconfig/packages/core/src/types/ir.ts, agentconfig/packages/core/src/types/generator.ts, agentconfig/packages/core/src/types/config.ts
---

## IR Type Rules

When modifying types in `packages/core/src/types/`:

### `ir.ts` — Intermediate Representation

- `ActivationType` is the union `'always' | 'scoped' | 'ai-decided' | 'manual'`. Do not add new values without updating all 8 generators and all 9 importers.
- `HookEventName` is the normalized event name set. Adding a new event requires updating `HOOK_EVENT_MAPS` in `generators/base.ts` and all hook-supporting generators (Cursor, Claude Code, Gemini CLI, Codex, Cline).
- `InstructionFile.globs` must be present when `activation === 'scoped'`. The validator enforces this, but parsers should also log a warning.
- `InstructionFile.description` must be present when `activation === 'ai-decided'`. Same enforcement.
- Do not add agent-specific fields to `InstructionFile` or `AgentDefinition`. Agent-specific concerns belong in the generator, not the IR.

### `generator.ts` — Plugin Interface

- `AgentGenerator.target` must match the string used in `config.yaml` targets and in `detectAgents()`.
- `FileOutput.path` is always relative to `outputDir` — no leading `/` or `./`.
- `GeneratorInput` is passed by value to generators; generators must not mutate it.

### `config.ts` — Config Schema

- `AgentConfig` is derived from `AgentConfigSchema` (Zod). Keep them in sync.
- The `targets` array is the source of truth for which generators run. Plugins extend it — they don't replace it.