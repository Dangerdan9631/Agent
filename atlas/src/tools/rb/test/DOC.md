# Atlas Ruby Tests

## Purpose

This directory verifies Ruby discovery, Prism extraction, Rails conventions,
portable linking, deterministic persistence, and command behavior.

## Conventions

- Use isolated temporary workspaces and never depend on repository-generated artifacts.
- Assert portable behavior rather than Prism's internal object representation.

## Contents

- Unit tests exercise extraction and discovery boundaries.
- Integration tests generate schema-valid version-two module models from representative workspaces.
