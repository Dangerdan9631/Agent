# Configuration Infrastructure

## Purpose

This directory parses, validates, and reports errors for the canonical Atlas JSON configuration file.

## Conventions

- Keep Ajv and Node filesystem details within this directory.
- Report JSON pointer locations and do not silently repair invalid policy.

## Contents

- `JsonAtlasConfigurationLoader.ts` loads and validates configuration files.
- `AtlasConfigurationError.ts` represents actionable configuration failures.
