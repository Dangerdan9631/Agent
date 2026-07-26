# Runtime Output Infrastructure

## Purpose

This directory contains the single adapter that emits intentional Atlas command output to standard streams.

## Conventions

- Keep output narrow and user-facing.
- Do not use this adapter for diagnostics or structured logging.

## Contents

- `ProcessRuntimeOutputWriter.ts` writes command results to Node.js standard streams.
