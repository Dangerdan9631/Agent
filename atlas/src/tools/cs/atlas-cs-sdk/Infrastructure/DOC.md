# C# SDK Analysis Infrastructure

## Purpose

This directory implements Roslyn document analysis, workspace selection policy,
stable identities, source mapping, and cross-module model linking.

## Conventions

- Compiler documents arrive through SDK inputs; this directory does not create MSBuild workspaces.
- Solution and project evaluation are narrow injected interfaces implemented by the CLI.
- Generated model values never contain absolute filesystem paths.

## Contents

- Compiler-backed extractors map declarations and semantic relationships.
- Discovery policy maps injected project metadata to portable module targets.
- Linkers resolve relationships across independently generated modules.
