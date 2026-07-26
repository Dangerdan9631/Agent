# Runtime Output Contract

## Purpose

This directory defines the narrow boundary for intentional Atlas command output.

## Conventions

- Only the concrete runtime adapter writes to standard streams.
- Diagnostics and error telemetry belong to the logging boundary instead.

## Contents

- `RuntimeOutputWriter.ts` declares user-facing standard-output and standard-error operations.
