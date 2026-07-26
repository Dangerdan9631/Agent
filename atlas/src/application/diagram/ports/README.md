# Diagram Artifact Ports

## Purpose

This directory defines the application boundary for persisting generated diagram documents.

## Conventions

- Writers receive scope-filtered diagram graphs instead of compiler or renderer types.
- Implementations enforce artifact-root containment and deterministic persistence.

## Contents

- `DiagramArtifactWriter.ts` defines graph, matrix, HTML, and navigation artifact persistence.
- `ArchitectureGenerationWorkflow.ts` defines validation-aware graph generation.
- `ArchitectureDiagramWorkflow.ts` defines validation-aware single-scope generation.
