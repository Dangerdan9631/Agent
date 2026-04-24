Rebuild the agentconfig tool and reinstall the global CLI binary.

## Steps

1. Build both packages from the workspace root:
   ```bash
   cd agentconfig && npm run build
   ```

2. Reinstall global CLI:
   ```bash
   npm install -g ./packages/cli
   ```

3. Verify:
   ```bash
   agentconfig --version
   agentconfig list-targets
   ```

If only the core package changed, you can skip the global reinstall — the globally installed CLI bundles core at install time.

If the build fails:
- Check for TypeScript errors: `cd packages/core && npx tsc --noEmit`
- Check for chalk ESM issues: ensure `chalk@^4.x` is installed, not v5