# Ruby CLI Library Source

## Purpose

This directory contains the Ruby CLI's application, composition, diagnostics,
configuration, and YAML persistence boundaries.

## Conventions

- Keep source analysis in `atlas-rb-sdk`.
- Keep process output and filesystem persistence behind focused adapters.
- Preserve the `atlas/rb` namespace used by the packaged executable.

## Contents

- `atlas/rb.rb` loads the CLI gem surface.
- `atlas/rb/` contains the CLI implementation.
