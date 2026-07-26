# Artifact Cleanup Ports

## Purpose

This directory defines the filesystem boundary for removing regenerable Atlas artifacts.

## Conventions

- Implementations must never remove the configured artifact root itself or any path outside it.

## Contents

- `ArtifactCleaner.ts` removes direct artifact-root children.
- `CleanArtifactsWorkflow.ts` defines workspace-aware cleanup execution.
