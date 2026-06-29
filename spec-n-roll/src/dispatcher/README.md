# Dispatcher

Dispatcher code decides which runtime entry point should handle a `spec-n-roll` invocation. It keeps local/global delegation, interactive mode selection, and child process execution separate from Commander command registration and Ink rendering.

The dispatcher should stay small and route only to the CLI, Ink, or local launcher entry points. Business behavior and project file operations belong in `src/sdk/`, while dependency registration belongs in `src/di/`.
