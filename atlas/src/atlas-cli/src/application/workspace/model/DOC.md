# Workspace Models

## Purpose

This directory contains immutable values representing packages selected for Atlas analysis.

## Conventions

- Paths are absolute only while interacting with the local workspace.
- Every discovered package records the explicit policy that admitted it.

## Contents

- `WorkspacePackage.ts` represents one analysable package.
- `WorkspaceLoadingRequest.ts` carries invocation path selections into workspace loading.
