# Artifact Viewing Application Domain

## Purpose

This directory resolves an Atlas workspace and delegates safe local artifact serving to an infrastructure boundary.

## Conventions

- The application layer selects the configured artifact root but has no HTTP or filesystem implementation detail.
- A successful view request returns a concrete local URL for the presentation layer to display.

## Contents

- `ViewArtifacts.ts` starts the local artifact server and optionally opens its ready URL.
- `ports/` defines local-server behavior.
- `model/` contains the returned server location.
