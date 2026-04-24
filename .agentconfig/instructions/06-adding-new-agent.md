---
activation: ai-decided
description: "Apply when adding a new supported agent target to agentconfig"
---

## Adding a New Agent Target

Follow this checklist when adding support for a new agent (e.g., `my-agent`):

### 1. Generator (`packages/core/src/generators/my-agent.ts`)

- Implement `AgentGenerator` with `target: 'my-agent'` and `displayName`.
- Handle all 4 activation types for instructions.
- Use `filterForTarget(ir.instructions, 'my-agent')` to respect `targets`/`excludedTargets`.
- Use `buildInTextCondition` for any activation type without native support.
- Handle agents, skills, commands, and hooks (or explicitly skip unsupported features).
- Export a named `MyAgentGenerator` constant.

### 2. Register (`packages/core/src/generators/index.ts`)

```ts
import { MyAgentGenerator } from './my-agent';
registry.register(MyAgentGenerator);
```

### 3. Importer (`packages/core/src/importers/my-agent.ts`)

- Export `importMyAgent(sourceDir): Promise<{ instructions: InstructionFile[], agents?: AgentDefinition[] }>`.
- Check for the agent's sentinel directory/file with `fs.existsSync` before reading.
- Map agent-native frontmatter/format to normalized IR activation types.
- Set `importNote` wherever activation is ambiguous.

### 4. Register importer (`packages/core/src/importers/index.ts`)

- Add to `IMPORTERS` map: `'my-agent': importMyAgent`.
- Add detection logic to `detectAgents()` with appropriate confidence level (`'high'` for dedicated directory, `'low'` for a shared root file).

### 5. Update docs

- Add a row to the Supported Agents table in `README.md`.
- Add the target to `config.yaml` examples.
- Update `HOOK_EVENT_MAPS` in `generators/base.ts` if the agent supports hooks.
