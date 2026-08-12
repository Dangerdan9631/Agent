# Configuration Ports

## Purpose

This directory defines the application boundary for composing and validating user-owned Atlas policy.

## Conventions

- Consumers receive one fully composed version-two root or a descriptive failure.
- In-memory root validation supports safe persistence without weakening the canonical filename rule.
- Implementations must not expose JSON-schema or filesystem details through this contract.

## Contents

- `AtlasConfigurationLoader.ts` defines configuration-loading behavior.
