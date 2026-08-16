# Federated Model Infrastructure

## Purpose

This directory contains filesystem adapters for independently generated Atlas module models.

## Conventions

- Configured model paths are canonical, contained by the artifact root's `model` directory, and loaded in declared order.
- Missing configured generated models are skipped; invalid present models and a zero-model result fail.

## Contents

- `NodeAtlasWorkspaceLoader.ts` reads, validates, and identity-links configuration-selected models.
