# Configuration Application Domain

## Purpose

This directory defines the vendor-neutral version-two root, base, and module configuration contracts.

## Conventions

- Loaded configuration is fully composed and contains normalized project-relative paths.
- Core policy contains no package discovery, compiler, build-system, or source-language fields.
- Infrastructure owns YAML parsing and JSON Schema validation; workflows depend on these contracts.

## Contents

- `model/` defines canonical configuration values.
- `ports/` defines configuration-loading behavior.
