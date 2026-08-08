# Command-Line Presentation

## Purpose

This directory owns the Atlas executable's argument parsing and command dispatch.

## Conventions

- Command handlers delegate to application workflows.
- User-facing text uses the runtime output boundary; diagnostics use the logger.

## Contents

- `AtlasCli.ts` provides validation, generation, layout, cleanup, federation, and interactive viewer commands.
- `atlas.ts` is the executable entrypoint.
