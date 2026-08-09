# Delivery application source

## Purpose

This directory contains the executable delivery package and composition root for the clean-architecture catalog demonstration.

## Conventions

- Keep user-facing output behind `RuntimeOutputWriter`.
- Keep concrete dependency construction below `composition`.
- Use package imports instead of source-relative imports across package boundaries.
- Keep date formatting and delivery-specific label formatting at this boundary.

## Contents

- `CatalogDemo.ts` coordinates use cases and presentation.
- `RuntimeOutputWriter.ts` implements the designed terminal output boundary.
- `composition` constructs all domain, application, and infrastructure dependencies.
- `main.ts` starts the composed demonstration.
