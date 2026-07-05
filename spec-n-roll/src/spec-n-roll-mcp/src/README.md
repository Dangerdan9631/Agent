# MCP source - src

This directory contains the MCP process entry point, CLI adapter, command runner boundary, and dependency composition for future protocol adapters. The source should translate process and protocol concerns into SDK-facing calls.

## Structure

```mermaid
flowchart TD
    Entry["entry point"]
    Cli["CLI adapter"]
    Composition["composition root"]
    Runner["command runner"]
    Protocol["protocol adapters"]

    Entry -->|"starts CLI"| Cli
    Cli -->|"uses composition"| Composition
    Composition -->|"wires runner"| Runner
    Runner -->|"hosts adapters"| Protocol
```

## Conventions

### Adapter shape

Keep command runner and protocol integration behind MCP adapter boundaries. Do not let MCP transport details leak into SDK business abstractions.

### Imports

Use the package-local `#mcp/*` import alias for source imports. Add new files for distinct adapter or composition responsibilities rather than expanding entry-point code.
