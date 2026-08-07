# Local Artifact Server Infrastructure

## Purpose

This directory hosts generated Atlas artifacts through a path-contained local HTTP server.

## Conventions

- Decode and validate request paths before resolving them under the artifact root.
- Reject traversal and unsupported methods without exposing filesystem paths.

## Contents

- `NodeArtifactServer.ts` serves static generated artifacts from one configured root.
- `NodeArtifactBrowser.ts` delegates opening a ready local URL to the host browser.
