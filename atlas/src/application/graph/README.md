# Semantic Graph Application Domain

## Purpose

This directory contains vendor-neutral declaration graph models and the compiler-analysis boundary used to understand TypeScript architecture.

## Conventions

- IDs are derived only from normalized workspace-relative paths and semantic names.
- Graph models never expose TypeScript compiler nodes or symbols.

## Contents

- `model/` contains declaration nodes and semantic relationships.
- `ports/` defines semantic graph construction.
