# Ruby CLI Schemas

## Purpose

This directory contains the packaged JSON Schema contracts used to validate
Atlas policy and portable YAML documents.

## Conventions

- Keep schema versions synchronized with the language-neutral Atlas CLI.
- Treat JSON as the schema representation, not as a generated model format.
- Package every schema required for standalone CLI validation.

## Contents

- The configuration schema validates `atlas.config.yml` documents.
- Module and workspace schemas validate generated YAML model contracts.
