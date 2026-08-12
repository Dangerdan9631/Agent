# Configuration Infrastructure

## Purpose

This directory parses, composes, serializes, validates, and reports errors for version-two Atlas YAML documents.

## Conventions

- Keep YAML, Ajv, and Node filesystem details within this directory.
- Resolve paths relative to their defining document and reject project-root escape after canonicalization.
- Missing or invalid fragments fail composition without partial policy fallback.

## Contents

- `YamlAtlasConfigurationLoader.ts` validates and composes root, base, and module documents.
- `YamlDocumentCodec.ts` owns deterministic YAML parsing and serialization.
- `AtlasConfigurationError.ts` represents actionable configuration failures.
