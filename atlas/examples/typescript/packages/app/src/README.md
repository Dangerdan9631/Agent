# Application source

## Purpose

This directory contains the executable package that composes the catalog package into a small user-facing demonstration. It depends on the catalog only through its published package API.

## Conventions

- Keep user-facing output behind `RuntimeOutputWriter`.
- Use package imports instead of source-relative imports across package boundaries.
- Keep date formatting and local text normalization inside the application boundary.

## Contents

- `CatalogDemo.ts` coordinates catalog creation and presentation.
- `main.ts` starts the demonstration.
