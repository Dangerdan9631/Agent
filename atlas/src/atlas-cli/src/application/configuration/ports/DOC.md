# Configuration Ports

## Purpose

This directory defines the application boundary for loading a user-owned Atlas policy file.

## Conventions

- Consumers receive validated configuration models or a descriptive failure.
- Implementations must not expose JSON-schema or filesystem details through this contract.

## Contents

- `AtlasConfigurationLoader.ts` defines configuration-loading behavior.
