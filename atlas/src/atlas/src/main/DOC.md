# Desktop Main Process

This directory contains the Electron presentation adapter. It delegates all
generation, serving, configuration mutation, and layout behavior to the
application host exported by `atlas-cli` and only owns window/process lifecycle.

- `AtlasDesktopArgumentParser.ts` accepts direct configuration paths plus
  explicit workspace, output, host, and port options.
- `AtlasDesktopLaunchOptions.ts` carries the validated host selection.
- `AtlasDesktopMain.ts` starts the shared artifact host and loads its URL in a
  sandboxed Electron `BrowserWindow`.
