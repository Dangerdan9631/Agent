# Federated Model Values

## Purpose

This directory defines YAML-compatible language-neutral module and resolved-workspace values.

## Conventions

- Artifact and declaration IDs are stable identities, not file locations.
- External targets are represented by artifact ID with an optional element ID.

## Contents

- `AtlasModuleModel.ts` defines published-artifact model contracts.
- `AtlasWorkspaceManifest.ts` selects module model files.
- `ResolvedAtlasWorkspace.ts` represents identity-linked loaded models.
- `ConfiguredAtlasWorkspace.ts` retains the loaded subset, missing paths, and policy keyed by module ID.
