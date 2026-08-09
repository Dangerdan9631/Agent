# Application source

## Purpose

This directory owns catalog use cases and the ports they require from outer adapters.

## Conventions

- Depend only on the domain package and application-owned interfaces.
- Keep persistence, parsing, time, and presentation behind ports.
- Return immutable reports and query views.

## Contents

- `catalog` contains import/query workflows, repository/reader/clock ports, and result models.
- `index.ts` publishes the application API.
