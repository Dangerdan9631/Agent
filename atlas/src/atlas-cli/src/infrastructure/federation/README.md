# Federated Model Infrastructure

## Purpose

This directory contains filesystem adapters for independently generated Atlas module models and workspace manifests.

## Conventions

- Manifest paths are relative and contained by the manifest directory.
- Missing dependency models remain valid unresolved external targets.

## Contents

- `NodeAtlasWorkspaceLoader.ts` reads, validates, and identity-links manifest-selected models.
