# Workspace Application Domain

## Purpose

This directory defines vendor-neutral project loading and compatibility package contracts.

## Conventions

- Package roots are absolute paths while persisted source paths remain workspace-relative.
- Canonical loading consumes only model paths in the composed configuration and retains missing paths.
- Source discovery remains isolated as a migration adapter and is not wired into production composition.

## Contents

- `model/` contains discovered package values.
- `ports/` contains package discovery behavior.
- `WorkspaceLoader.ts` coordinates composition, paths, configured model loading, partial-project warnings, and derived module metadata.
