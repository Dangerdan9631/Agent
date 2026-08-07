# Logging Infrastructure

## Purpose

This directory adapts tslog to the local Atlas diagnostic logging contract.

## Conventions

- Keep tslog-specific types within this directory.
- Preserve the structured context supplied by application code.

## Contents

- `TslogAtlasLogger.ts` writes Atlas diagnostic events through tslog.
