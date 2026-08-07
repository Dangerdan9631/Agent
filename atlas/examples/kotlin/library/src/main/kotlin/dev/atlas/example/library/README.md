# Catalog Kotlin source

## Purpose

This directory models the lower-level Kotlin catalog artifact. It validates a simple product document before publishing a product value to dependent modules.

## Conventions

- Keep external JSON parsing inside this package boundary.
- Represent the catalog API with focused classes.
- Do not depend on the application artifact.

## Contents

- `Catalog.kt` defines product parsing and normalization.
