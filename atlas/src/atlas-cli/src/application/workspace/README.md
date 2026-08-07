# Workspace Application Domain

## Purpose

This directory defines vendor-neutral workspace and package discovery contracts.

## Conventions

- Package roots are absolute paths while persisted source paths remain workspace-relative.
- Discovery applies explicit policy and never infers runtime classification from names.

## Contents

- `model/` contains discovered package values.
- `ports/` contains package discovery behavior.
- `WorkspaceLoader.ts` coordinates configuration, paths, and package discovery for source commands; manifest-backed federated commands use their selected models instead.
