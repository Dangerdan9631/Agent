# Artifact Cleanup Application Domain

## Purpose

This directory resolves a workspace and delegates removal of regenerable files under its configured artifact root.

## Conventions

- Cleanup requires an explicit presentation-layer confirmation before this workflow is invoked.
- The artifact root itself remains intact; only its direct children may be removed.

## Contents

- `CleanArtifacts.ts` coordinates workspace resolution and constrained artifact cleanup.
- `ports/` defines cleanup behavior.
