# Workspace Infrastructure

## Purpose

This directory discovers local package manifests and applies Atlas's explicit package policy.

## Conventions

- Normalize matching paths to slash-separated workspace-relative form.
- Reject ambiguous policy, duplicate package names, escaped paths, and missing configured source roots.

## Contents

- `WorkspacePackageDiscoverer.ts` locates and classifies package roots.
- `PackagePolicySelector.ts` chooses one explicit policy for a discovered package.
