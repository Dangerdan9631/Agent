# Semantic Graph Models

## Purpose

This directory models the declaration-level graph that diagram projections consume.

## Conventions

- Declaration paths are workspace-relative and slash-normalized.
- External targets remain explicit graph nodes rather than being guessed as local declarations.

## Contents

- `DeclarationGraph.ts` groups stable declaration nodes and semantic relationships.
