# CLI

Command-line entry points and command adapters for spec-n-roll. This layer routes explicit subcommands into toolkit operations without owning workflow or file mutation logic.

The dispatcher lives in `src/dispatcher/` and decides whether bare invocation should launch the Ink entry point or command arguments should launch this CLI entry point. The full CLI remains non-interactive for scripted use and Commander subcommands.

## Self-contained local install layout

Project-local binaries live under `.spec-n-roll/cli/` as a complete, pinned toolkit runtime. `local-install/local-binaries.ts` stages the build output from `dist/local-bundle/` into each project during `init`, `update`, and manage-local binary refresh.

```text
.spec-n-roll/cli/
├── install.json          # layout v1 manifest (toolkitVersion, layoutVersion, installedAt)
├── package.json          # minimal descriptor (name spec-n-roll, version)
├── bin/                  # thin launchers that spawn in-tree bundles
│   ├── spec-n-roll
│   ├── snr
│   └── spec-n-roll-mcp
└── dist/                 # copied from toolkit dist/local-bundle/
    ├── cli/index.js
    ├── mcp/server.js
    └── templates/
```

Launchers resolve `../dist/cli/index.js` or `../dist/mcp/server.js` relative to `bin/` and spawn Node with `stdio: 'inherit'`. The CLI launcher sets `SPEC_N_ROLL_LOCAL_PIN=1` on the bundled full CLI child. Legacy installs that reference an external `toolkitPackageRoot` are refreshed by `update` into the self-contained layout.

Commander subcommands include workflow mutations, step init/finalize, set-list management, manifesto read helpers, and `repository-workflow` onboarding/drift commands (`types list`, `plan`, `start`, `drift run`, `report read`). Bare `spec-n-roll` launches the Ink app documented in `docs/cli.md`, including read-only repository workflow report browsing from the project hub.

## Dispatcher behavior

`src/dispatcher/index.ts` delegates to the dispatcher class, which walks parent directories from `cwd` for a `.spec-n-roll` project marker. When a project-local runtime is selected, process execution validates that the selected CLI entrypoint is executable before spawning it. Passing `--global` forces the global CLI path.

Version skew between dispatcher and local bundle is not blocked at spawn time. After delegation, the full CLI version report shows the executed bundled version from `.spec-n-roll/cli/package.json`.
