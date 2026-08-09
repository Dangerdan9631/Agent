# Local Artifact Server Infrastructure

## Purpose

This directory hosts generated Atlas artifacts through a path-contained local HTTP server.

## Conventions

- Decode and validate request paths before resolving them under the artifact root.
- Reject traversal and unsupported methods without exposing filesystem paths.
- Regenerate neutral diagram artifacts after validated viewer policy mutations.

## Contents

- `NodeArtifactServer.ts` serves generated artifacts, persists layouts and PNGs, and applies constrained policy changes.
- `NodeArtifactBrowser.ts` delegates opening a ready local URL to the host browser.
