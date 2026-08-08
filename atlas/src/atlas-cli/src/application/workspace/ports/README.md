# Workspace Discovery Ports

## Purpose

This directory defines package discovery behavior required by Atlas workflows.

## Conventions

- Discovery uses a resolved workspace root and validated configuration.
- Implementations return only explicitly classified packages.

## Contents

- `WorkspacePackageDiscoverer.ts` defines workspace package discovery.
- `ManifestWorkspacePackageResolver.ts` classifies selected portable module models.
- `WorkspaceLoadingWorkflow.ts` defines command-ready workspace loading.
