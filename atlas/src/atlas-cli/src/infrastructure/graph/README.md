# Semantic Graph Infrastructure

## Purpose

This directory adapts the TypeScript compiler API into stable Atlas declaration graph models.

## Conventions

- Compiler symbols and syntax trees stay within this directory.
- All persisted identities use workspace-relative slash-normalized paths.

## Contents

- `TypeScriptDeclarationGraphBuilder.ts` traverses top-level declarations and relationships.
