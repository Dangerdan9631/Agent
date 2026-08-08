# Artifact Infrastructure

## Purpose

This directory persists deterministic Atlas-generated artifacts under a configured artifact root.

## Conventions

- Every write validates containment under the artifact root and uses atomic replacement where supported.
- Persisted JSON is canonical, sorted, and portable across workstations.

## Contents

- `NodeDependencyAnalysisArtifactWriter.ts` writes raw dependency analysis reports.
- `LegacyAutoLayoutScript.ts` embeds the hierarchy-aware Cytoscape layout behavior retained for viewer fidelity.
- `NodeDiagramArtifactWriter.ts` emits full graph and matrix viewers and copies its package-resolved Cytoscape runtime into the artifact root for offline use.
