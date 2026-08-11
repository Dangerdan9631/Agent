# Ruby CLI Executable

## Purpose

This directory contains the installed command entry point for the Atlas Ruby
CLI gem.

## Conventions

- Keep the executable limited to loading and invoking the CLI host.
- Place generation, diagnostics, and persistence behavior under `lib`.

## Contents

- `atlas-rb` starts the packaged Ruby command-line application.
