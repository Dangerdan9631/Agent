# Architecture source - src

This directory contains the architecture CLI, workspace package discovery, dependency-cruiser orchestration, Cytoscape conversion, artifact generation workflows, and local diagram viewing. The code turns dependency information into validation and visual outputs without becoming part of application runtime behavior.

## Structure

```mermaid
flowchart TD
    Cli["CLI adapter"]
    Discovery["workspace discovery"]
    Policy["dependency policy"]
    Cruise["dependency analysis"]
    Conversion["graph conversion"]
    Artifacts["artifact generation"]
    Viewer["viewer server"]

    Cli -->|"starts workflow"| Discovery
    Cli -->|"starts viewer"| Viewer
    Discovery -->|"feeds packages"| Policy
    Discovery -->|"feeds packages"| Cruise
    Cruise -->|"produces data"| Conversion
    Conversion -->|"feeds pages"| Artifacts
    Viewer -->|"writes layouts"| Artifacts
```

## Conventions

### Tool boundaries

Represent dependency-cruiser and filesystem access as architecture adapters that feed workspace package and graph models. Conversion and page generation should work from those local architecture models rather than raw tool output wherever practical.

### Policy changes

Represent new architectural rules as explicit policy concepts. Avoid mixing rule decisions into artifact rendering or CLI command parsing.

### Viewer persistence

Keep diagram layout persistence behind the local viewer server. Generated HTML may request layout reads and writes, but repository file writes should remain in infrastructure adapters.
