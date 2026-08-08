# Artifact Viewing Ports

## Purpose

This directory declares the local-server boundary used by artifact viewing workflows.

## Conventions

- Server implementations must constrain all served files to the resolved artifact root.
- Viewer policy changes call back through application-owned artifact regeneration.

## Contents

- `ArtifactServer.ts` starts a local artifact server.
- `ArtifactConfigurationChangeHandler.ts` refreshes artifacts after policy mutation.
- `ArtifactBrowser.ts` opens a ready local artifact URL.
- `ViewArtifactsWorkflow.ts` defines workspace-aware view execution.
