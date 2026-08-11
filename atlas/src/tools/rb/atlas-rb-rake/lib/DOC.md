# Ruby Rake Integration Source

## Purpose

This directory contains the packaged loader for Atlas's native Rake task
integration.

## Conventions

- Keep generation behavior in the Ruby CLI and SDK packages.
- Limit this gem to configuration-driven task registration and invocation.
- Preserve the `atlas/rb` namespace used by consuming Rakefiles.

## Contents

- `atlas/rb/` contains the Rake task definitions.
