# Workspace packages - src

This directory contains the workspace package set for the current spec-n-roll implementation. Each child directory is an npm workspace package with an explicit execution, library, architecture, or test-support responsibility.

## Structure

```mermaid
flowchart TD
    Workspace["src workspace packages"]
    Api["spec-n-roll-api"]
    Dispatcher["spec-n-roll"]
    Runtime["spec-n-roll-runtime"]
    Sdk["spec-n-roll-sdk"]
    Mcp["spec-n-roll-mcp"]
    Arch["spec-n-roll-arch"]
    Test["spec-n-roll-test"]

    Workspace -->|"contains packages"| Api
    Workspace -->|"contains packages"| Dispatcher
    Workspace -->|"contains packages"| Runtime
    Workspace -->|"contains packages"| Sdk
    Workspace -->|"contains packages"| Mcp
    Workspace -->|"contains packages"| Arch
    Workspace -->|"contains packages"| Test
    Dispatcher -->|"uses boundary"| Api
    Runtime -->|"uses boundary"| Api
    Runtime -->|"uses behavior"| Sdk
    Mcp -->|"adapts behavior"| Sdk
    Arch -->|"validates packages"| Workspace
    Test -->|"supports tests"| Workspace
```

## Conventions

### Package boundaries

Keep behavior inside the package that owns the reason to change. Cross-package data contracts belong in `spec-n-roll-api`, reusable business behavior belongs in `spec-n-roll-sdk`, and executable transports should adapt those boundaries instead of duplicating rules.

### Local documentation

Every package directory and package source directory keeps its own `README.md`. Update the nearest README when a change alters a directory's purpose, conventions, or architectural role.
