# Atlas CLI Build Scripts

## Purpose

This directory contains build-time adapters that prepare non-TypeScript assets
for the distributable language-neutral CLI package.

## Conventions

- Keep runtime behavior under `src`.
- Resolve package paths deterministically from the script location.
- Fail the build when required distributable assets cannot be copied.

## Contents

- `CopyBuildAssets.mjs` copies schemas and other runtime assets into `dist`.
