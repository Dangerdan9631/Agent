# TypeScript Example Packages

## Purpose

This directory contains the executable and reusable npm workspace packages that
form the TypeScript reading-list example.

## Conventions

- Keep the dependency direction from `app` to `lib` only.
- Give each package its own manifest and direct dependency declarations.
- Keep shared behavior in `lib` and process behavior in `app`.

## Contents

- `app/` contains the executable command-line package.
- `lib/` contains the reusable reading-list package.
