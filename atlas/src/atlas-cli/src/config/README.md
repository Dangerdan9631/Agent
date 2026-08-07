# Configuration Assets

## Purpose

This directory contains distributable JSON Schemas for Atlas policy, module models, and workspace manifests.

## Conventions

- Keep the schema version aligned with the application configuration model.
- Use descriptions for every public schema property.

## Contents

- `atlas.schema.json` validates version-one discovery, artifact, and layout policy.
- `atlas-module.schema.json` validates one language-neutral artifact model.
- `atlas-workspace.schema.json` validates the manifest that selects model files.
