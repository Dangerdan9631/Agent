---
name: add-importer
description: 'Add a reverse-parser (importer) for a new agent target to agentconfig. Use when adding import support for a new agent, parsing agent-native files into IR, or implementing the import pipeline for a new target.'
---

# Skill: add-importer

Add a reverse-parser (importer) for a new agent target to `agentconfig`.

## Steps

1. Create `agentconfig/packages/core/src/importers/<target>.ts`
   - Export `import<Target>(sourceDir: string): Promise<{ instructions: InstructionFile[], agents?: AgentDefinition[] }>`
   - Guard every directory read with `fs.existsSync`
   - Map agent-native frontmatter/triggers to `ActivationType`
   - Set `importNote` on ambiguous activation inferences

2. Add to `IMPORTERS` map in `agentconfig/packages/core/src/importers/index.ts`:
   ```ts
   import { import<Target> } from './<target>';
   const IMPORTERS: Record<string, AgentImporter> = {
     ...
     '<target>': import<Target>,
   };
   ```

3. Add detection logic in `detectAgents()` in `importers/index.ts`:
   ```ts
   if (fs.existsSync(path.join(dir, '.<target>'))) {
     detected.push({ name: '<target>', confidence: 'high' });
   }
   ```

4. Test with dry-run:
   ```bash
   agentconfig import <project-dir> --from <target>
   ```

## References

- [importers/windsurf.ts](../agentconfig/packages/core/src/importers/windsurf.ts) — simple trigger-map pattern
- [importers/claude-code.ts](../agentconfig/packages/core/src/importers/claude-code.ts) — multi-type + agents
- [importers/index.ts](../agentconfig/packages/core/src/importers/index.ts)
- [types/ir.ts](../agentconfig/packages/core/src/types/ir.ts)
