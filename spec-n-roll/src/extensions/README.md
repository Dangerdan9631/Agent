# Extensions

Contracts and runtime loading for agent and workflow extensions with or registered in a project.

`manifest.ts` validates extension manifests, including dynamic `before_{stepId}` / `after_{stepId}` hooks and rejection of `before_update` / `after_update`. `hooks.ts` loads registrations from `workflow.config.json`, builds the merged step registry, resolves highest-priority step handlers, dispatches hooks, and invokes handler modules in-process via Node `import()`. `compatibility.ts` surfaces non-blocking toolkit version warnings during update.
