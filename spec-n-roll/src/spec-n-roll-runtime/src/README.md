# Runtime source - src

This directory contains the runtime entry point, CLI adapter, composition root, invocation reader and parser, runtime application, and output boundary. Runtime source turns dispatcher-provided invocation data into command execution while keeping process I/O at the edges.

## Structure

```mermaid
flowchart TD
    Entry["entry point"]
    Cli["CLI adapter"]
    Composition["composition root"]
    Reader["environment invocation reader"]
    Parser["invocation parser"]
    Application["runtime application"]
    Output["output writer"]

    Entry -->|"starts CLI"| Cli
    Cli -->|"uses composition"| Composition
    Composition -->|"wires dependencies"| Application
    Application -->|"reads stdin"| Reader
    Application -->|"parses payload"| Parser
    Application -->|"writes result"| Output
```

## Conventions

### Process I/O

Keep process environment and terminal access inside adapter classes. Application code should depend on invocation-reader and UI-renderer interfaces rather than Node process globals. Standard input remains attached to the terminal for Ink keyboard handling.

### Payload handling

Parse the API package payload shape before executing command behavior. Runtime logs from this source directory should identify the invocation context, parse result, and selected command path.
