# C# Generator Configuration

## Purpose

This directory represents and validates the Atlas configuration fields needed
for C# project discovery and artifact generation.

## Conventions

- Validate against the canonical shared schema before deserialization.
- Retain shared-CLI configuration without interpreting it in the generator.

## Contents

- `AtlasConfiguration` models relevant configuration sections.
- `AtlasConfigurationLoader` validates and loads configuration documents.
