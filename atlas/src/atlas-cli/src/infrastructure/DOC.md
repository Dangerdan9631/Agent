# Infrastructure Layer

## Purpose

This directory contains adapters for Node.js and third-party tooling. It keeps those implementation details outside application policy and workflows.

## Conventions

- Concrete adapters implement application-defined interfaces.
- Filesystem, process, HTTP, compiler, and vendor APIs do not leak into the application layer.
- Adapters receive their dependencies through constructors.

## Contents

- `logging/` contains the tslog adapter.
- `output/` contains the standard-stream output adapter.
