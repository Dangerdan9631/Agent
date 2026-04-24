---
name: add-generator
description: 'Add a new built-in generator to agentconfig. Use when adding support for a new agent target, implementing a generator file, or registering a new target with the generator registry.'
---

# Skill: add-generator

Add a new built-in generator to `agentconfig`.

## Steps

1. Create `agentconfig/packages/core/src/generators/<target>.ts`
   - Export a named `<Target>Generator` object implementing `AgentGenerator`
   - Handle `always`, `scoped`, `ai-decided`, and `manual` activations
   - Use helpers from `generators/base.ts`: `filterForTarget`, `buildFrontmatter`, `buildInTextCondition`

2. Register in `agentconfig/packages/core/src/generators/index.ts`:
   ```ts
   import { <Target>Generator } from './<target>';
   registry.register(<Target>Generator);
   ```

3. Verify registration:
   ```bash
   agentconfig list-targets
   ```

## References

- [generators/base.ts](../agentconfig/packages/core/src/generators/base.ts)
- [types/generator.ts](../agentconfig/packages/core/src/types/generator.ts)
- [types/ir.ts](../agentconfig/packages/core/src/types/ir.ts)
- Existing example: [generators/windsurf.ts](../agentconfig/packages/core/src/generators/windsurf.ts)
