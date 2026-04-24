# Skill: validate-and-generate

Validate `.agentconfig/` and regenerate all agent-native directive files.

## Steps

1. Validate configuration:
   ```bash
   agentconfig validate --strict
   ```
   Fix any reported errors or warnings before proceeding.

2. Preview changes (optional):
   ```bash
   agentconfig diff
   ```

3. Generate all targets:
   ```bash
   agentconfig generate
   ```
   Or generate for specific targets only:
   ```bash
   agentconfig generate --target copilot --target cursor
   ```

4. Verify generated files are committed (CI check):
   ```bash
   agentconfig diff   # exits non-zero if anything is out of date
   ```

## Common Validation Errors

| Error | Fix |
|---|---|
| `globs required for scoped activation` | Add `globs:` field to frontmatter |
| `description required for ai-decided activation` | Add `description:` field |
| `File exceeds 12,000 chars (Antigravity/Windsurf)` | Split instruction into smaller files or exclude those targets |
| `Cursor global rule exceeds 6,000 chars` | Add `excludedTargets: [cursor]` or split the file |

## References

- [config.yaml schema](../agentconfig/packages/core/src/types/config.ts)
- [validator.ts](../agentconfig/packages/core/src/validator.ts)
