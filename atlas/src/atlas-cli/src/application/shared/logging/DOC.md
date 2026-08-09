# Logging Contracts

## Purpose

This directory defines diagnostic logging behavior used by application workflows without coupling them to a logging library.

## Conventions

- Log entries include structured context whenever a command makes a meaningful decision.
- Logging is not a substitute for the user-facing output contract.

## Contents

- `AtlasLogger.ts` declares Atlas diagnostic logging operations.
- `AtlasLogLevelController.ts` declares optional command-level diagnostic verbosity control.
