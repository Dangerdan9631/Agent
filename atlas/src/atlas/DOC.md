# Atlas Desktop

The `atlas` package is a thin Electron presentation adapter over the hosted
viewer exported by `atlas-cli`. It does not parse TypeScript or Kotlin source
and does not own a second graph implementation.

## Usage

Build the workspace, then provide an Atlas configuration directly or through
the legacy-compatible `view` prefix:

```sh
atlas atlas.config.yml
atlas view --config atlas.config.yml --workspace .
atlas images --config atlas.config.yml --workspace .
```

The desktop process starts the same path-contained local artifact server used
by `atlas-cli view`, loads its landscape URL in a sandboxed browser window, and
stops the server when Electron exits.

`atlas images` instead loads that landscape in a hidden Electron window,
invokes the viewer's own Export All routine, and exits after every image has
been persisted.

## Contents

- `scripts/AtlasElectronLauncher.mjs` starts the installed Electron runtime.
- `src/main/AtlasDesktopArgumentParser.ts` validates desktop host arguments.
- `src/main/AtlasDesktopMain.ts` owns the Electron and local-server lifecycle.
- `tests/` verifies desktop argument compatibility.
