# Layout Models

## Purpose

This directory models persisted node positions and deterministic auto-layout settings.

## Conventions

- Coordinates use the renderer model coordinate system and fixed three-decimal precision.
- Parent IDs and hidden relationship IDs are retained only when they still belong to the live graph.

## Contents

- `LayoutDocument.ts` represents persisted layout state and layout settings.
