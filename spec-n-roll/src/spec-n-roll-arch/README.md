# spec-n-roll-arch - package root

This package owns workspace architecture validation and dependency visualization. It treats architecture checks, generated diagrams, and checked-in diagram layout files as development artifacts that describe package relationships rather than runtime behavior.

## Structure

```mermaid
flowchart TD
    Cli["architecture CLI"]
    Source["architecture source"]
    Config["dependency rules"]
    Artifacts["architecture artifacts"]
    Viewer["local diagram viewer"]
    Packages["workspace packages"]

    Cli -->|"runs workflows"| Source
    Source -->|"reads rules"| Config
    Source -->|"writes artifacts"| Artifacts
    Cli -->|"starts viewer"| Viewer
    Viewer -->|"persists layout"| Artifacts
    Source -->|"inspects packages"| Packages
```

## Conventions

### Validation scope

Keep architecture policy focused on package dependencies and generated visualization data. Runtime architecture contracts should remain in `spec-n-roll-api`, not in this package.

### Generated artifacts

Architecture outputs belong under the package's artifact directories. Source code should model artifact generation through injectable readers, runners, converters, and writers.

### Diagram layout

Diagram layout is repository state, not browser state. Use the local viewer to autosave node and group positions into sibling `*.layout.json` files, and do not reintroduce manual export or config-seeded layout flows.
