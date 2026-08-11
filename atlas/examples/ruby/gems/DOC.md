# Ruby Example Gems

## Purpose

This directory contains the independently packaged executable and reusable
modules that form the Ruby reading-list example.

## Conventions

- Keep the dependency direction from `app` to `lib` only.
- Give each module its own gemspec and direct dependency declarations.
- Keep shared behavior in `lib` and process behavior in `app`.

## Contents

- `app/` contains the executable command-line gem.
- `lib/` contains the reusable reading-list gem.
