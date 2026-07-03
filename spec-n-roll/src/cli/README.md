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

Launchers resolve `../dist/cli/index.js` or `../dist/mcp/server.js` relative to `bin/` and spawn Node with `stdio: 'inherit'`. The CLI launcher sets `SPEC_N_ROLL_LOCAL_PIN=1` on the bundled full CLI child. Legacy installs that reference an external `toolkitPackageRoot` are rejected until `update` migrates the layout.

`local-install/local-install-integrity.ts` validates the on-disk layout before delegation: required paths, `layoutVersion === 1`, `package.json` name, and absence of legacy markers. Integrity failures return actionable messages suggesting `spec-n-roll update` or `spec-n-roll init`.

Commander subcommands include workflow mutations, step init/finalize, set-list management, manifesto read helpers, and `repository-workflow` onboarding/drift commands (`types list`, `plan`, `start`, `drift run`, `report read`). Bare `spec-n-roll` launches the Ink app documented in `docs/cli.md`, including read-only repository workflow report browsing from the project hub.

## Dispatcher integrity behavior

`src/dispatcher/index.ts` walks parent directories from `cwd` for `.spec-n-roll/cli/bin/spec-n-roll`. When a local binary is found, it runs `validateLocalInstall` on `.spec-n-roll/cli` before spawning unless the command is a repair flow (`update`, `init`, `remove`, or bare interactive invocation). Invalid installs exit non-zero with the validation message; the dispatcher does not silently fall back to the global full CLI unless `--global` was passed.

Version skew between dispatcher and local bundle is not blocked at spawn time. After delegation, the full CLI version report shows the executed bundled version from `.spec-n-roll/cli/package.json`.
