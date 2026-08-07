# Atlas Desktop Source

The desktop application has a privileged Electron main process, a narrow
preload API, and a sandboxed React renderer. Renderer code never reads the
filesystem directly.
