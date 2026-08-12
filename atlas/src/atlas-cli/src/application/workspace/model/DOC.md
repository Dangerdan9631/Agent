# Workspace Models

## Purpose

This directory contains immutable values representing a composed project and its loaded model subset.

## Conventions

- Paths are absolute only while interacting with the local workspace.
- Every discovered package records the explicit policy that admitted it.

## Contents

- `WorkspacePackage.ts` represents one analysable package.
- `WorkspaceLoadingRequest.ts` carries invocation path selections into workspace loading.
- `WorkspaceSnapshot.ts` retains composed policy, loaded facts, missing models, and module policy.
