# Federated Model Ports

## Purpose

This directory defines boundaries for loading canonical federated workspaces.

## Conventions

- Ports expose only language-neutral model contracts.
- Implementations may read files but callers do not depend on filesystem details.

## Contents

- `AtlasWorkspaceLoader.ts` loads configured models in declaration order and resolves selected identities.
