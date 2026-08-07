# Artifact Viewing Ports

## Purpose

This directory declares the local-server boundary used by artifact viewing workflows.

## Conventions

- Server implementations must constrain all served files to the resolved artifact root.

## Contents

- `ArtifactServer.ts` starts a local artifact server.
- `ArtifactBrowser.ts` opens a ready local artifact URL.
- `ViewArtifactsWorkflow.ts` defines workspace-aware view execution.
