# Ruby CLI Implementation

## Purpose

This directory implements command parsing, workspace configuration, SDK
orchestration, schema validation, logging, and portable document output.

## Conventions

- Depend on the Ruby SDK through its public generation behavior.
- Keep user-facing output separate from diagnostic logging.
- Write deterministic YAML without leaking parser details into CLI types.

## Contents

- CLI and host types translate process input into generation requests.
- Composition and adapter types connect configuration, logging, and persistence.
