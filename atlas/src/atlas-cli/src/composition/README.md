# Composition Layer

## Purpose

This directory is the only production location that chooses concrete implementations for Atlas interfaces.

## Conventions

- Constructors wire dependencies without performing I/O or application work.
- Application and presentation types must not construct concrete infrastructure adapters directly.

## Contents

- `AtlasCompositionRoot.ts` creates the command-line dependency graph.
