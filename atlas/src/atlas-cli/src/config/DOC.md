# Configuration Assets

## Purpose

This directory contains distributable JSON Schemas for version-two project policy, fragments, and generated models.

## Conventions

- Keep the schema version aligned with the application configuration model.
- Use descriptions for every public schema property.

## Contents

- `atlas.schema.json` validates the root and defines shared base and module fragment schemas.
- `atlas-base.schema.json` exposes the base-fragment schema.
- `atlas-module-config.schema.json` exposes the complete module-fragment schema.
- `atlas-module.schema.json` validates one deterministic version-two language-neutral model.
