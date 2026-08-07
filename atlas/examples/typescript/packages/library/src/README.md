# Catalog source

## Purpose

This directory defines the catalog package's validated product model. It is the lower-level package in the example workspace.

## Conventions

- Export the package API from focused classes.
- Keep schema validation inside the catalog boundary.
- Use `lodash-es` only for local data normalization.

## Contents

- `Catalog.ts` validates and exposes catalog products.
