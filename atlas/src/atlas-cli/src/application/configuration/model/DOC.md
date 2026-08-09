# Configuration Models

## Purpose

This directory contains immutable values that describe Atlas configuration relevant to workspace discovery and artifact placement.

## Conventions

- Paths use slash-separated workspace-relative form unless documented as absolute.
- Model interfaces contain no filesystem or third-party schema types.

## Contents

- `AtlasConfiguration.ts` defines the version-one canonical configuration shape.
