# Dispatcher metadata domain - src/spec-n-roll/src/application/dispatcher

This directory resolves dispatcher package metadata from raw filesystem values. It owns package-file parsing and the shared metadata contract sent to runtimes.

## Conventions

### Metadata policy

Keep package-layout interpretation and fallback values here. Filesystem adapters only return raw text and paths.
