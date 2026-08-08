# Application source tree

## Purpose

This source tree owns Kotlin catalog use cases and the ports they require from outer adapters.

## Conventions

- Depend only on the domain module and application-owned interfaces.
- Keep persistence, parsing, time, and presentation behind ports.
- Return immutable reports and query views.

## Contents

- `main/kotlin/dev/atlas/example/application/catalog` contains import/query workflows, ports, and result models.
