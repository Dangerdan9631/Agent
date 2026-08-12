# Federated Model Infrastructure

## Purpose

This directory contains filesystem adapters for independently generated Atlas module models.

## Conventions

- Configured model paths are canonical, project-contained, and loaded in declared order.
- Missing configured generated models are skipped; invalid present models and a zero-model result fail.

## Contents

- `NodeAtlasWorkspaceLoader.ts` reads, validates, and identity-links configuration-selected models.
- `ManifestWorkspacePackageResolver.ts` applies explicit package policy to opaque module IDs.
