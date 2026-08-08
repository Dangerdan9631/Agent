# Composition Layer

## Purpose

This directory is the only production location that chooses concrete implementations for Atlas interfaces.

## Conventions

- Constructors wire dependencies without performing I/O or application work.
- Application and presentation types must not construct concrete infrastructure adapters directly.

## Contents

- `AtlasCompositionRoot.ts` creates the command-line and hosted-viewer dependency graphs.
- `AtlasArtifactHost.ts` exposes the shared viewer lifecycle to desktop and other presentation adapters.
- `AtlasArtifactHostOptions.ts` defines its presentation-neutral startup contract.
