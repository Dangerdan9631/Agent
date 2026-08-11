# Ruby SDK Library Source

## Purpose

This directory contains the Ruby SDK's public loader and process-independent
source-analysis implementation.

## Conventions

- Keep CLI, Rake, process-output, and document-persistence behavior outside the SDK.
- Keep parser and framework conventions behind focused model-building types.
- Preserve the `atlas/rb` namespace across packaged SDK files.

## Contents

- `atlas/rb/` contains the public SDK surface and implementation types.
