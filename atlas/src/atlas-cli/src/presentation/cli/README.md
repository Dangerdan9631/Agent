# Command-Line Presentation

## Purpose

This directory owns the Atlas executable's argument parsing and command dispatch.

## Conventions

- Command handlers delegate to application workflows.
- User-facing text uses the runtime output boundary; diagnostics use the logger.

## Contents

- `AtlasCli.ts` provides the initial command shell.
- `atlas.ts` is the executable entrypoint.
