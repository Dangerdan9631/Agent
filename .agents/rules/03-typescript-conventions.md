---
activation: always
---

## TypeScript Conventions

- **TypeScript 5.3+**, `strict: true`. All new code must compile with zero type errors.
- Use `type` imports for type-only imports: `import type { IR } from '../types/ir'`.
- Prefer `interface` for object shapes that may be extended (e.g., `AgentGenerator`); `type` for unions and aliases.
- No `any`. Use `unknown` at boundaries and narrow with type guards.

## Code Style

- **No `.js` extensions** in relative imports (bundler resolution handles it).
- `async`/`await` over raw Promises.
- Named exports only — no default exports except in `tsup.config.ts` and Commander program.
- Keep functions small and single-purpose. Extract helpers to `utils.ts` or `generators/base.ts` rather than inlining.

## Error Handling

- CLI: write to `stderr` + `process.exit(1)` via the `die()` helper for all fatal errors.
- Core library: throw typed `Error` instances with descriptive messages. Do not `process.exit` inside core.
- Validate at system boundaries (CLI args, `config.yaml` parse, `.agentconfig/` parse) — not throughout the pipeline.

## Naming

- Generator classes/objects: `PascalCase` + `Generator` suffix (e.g., `CursorGenerator`).
- Importer functions: `import<AgentName>` (e.g., `importClaudeCode`).
- Parser functions: `parse<Type>` (e.g., `parseInstructions`).
- File-level constants and utility functions: `camelCase`.
- Normalized event names (IR): `PascalCase` (`PreToolUse`, `SessionStart`).

## Dependencies

- Keep the dependency footprint small. Before adding a new dependency, check if the functionality can be achieved with existing deps or Node built-ins.
- Only add to `packages/core/package.json` if the functionality is used in the core library. CLI-only deps go only in `packages/cli/package.json`.