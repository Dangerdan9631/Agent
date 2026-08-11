# Configuration Application Domain

## Purpose

This directory defines the vendor-neutral configuration model and ports used to interpret user-owned Atlas policy.

## Conventions

- Configuration values are immutable data and contain normalized workspace-relative paths after loading.
- Infrastructure owns YAML parsing and JSON Schema validation; workflows depend on these contracts.

## Contents

- `model/` defines canonical configuration values.
- `ports/` defines configuration-loading behavior.
