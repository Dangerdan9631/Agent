# Delivery application source tree

## Purpose

This source tree contains the executable Kotlin delivery artifact and its concrete catalog composition root.

## Conventions

- Compose external and catalog dependencies at the delivery boundary.
- Keep executable startup behavior in a dedicated composition root.
- Keep user-facing output behind the runtime output writer.

## Contents

- `main/kotlin` contains delivery, composition, and executable production code.
