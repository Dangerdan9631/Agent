# Configuration Infrastructure

## Purpose

This directory parses, serializes, validates, and reports errors for canonical Atlas YAML documents.

## Conventions

- Keep YAML, Ajv, and Node filesystem details within this directory.
- Report schema pointer locations and do not silently repair invalid policy.

## Contents

- `YamlAtlasConfigurationLoader.ts` loads and validates configuration files.
- `YamlDocumentCodec.ts` owns deterministic YAML parsing and serialization.
- `AtlasConfigurationError.ts` represents actionable configuration failures.
