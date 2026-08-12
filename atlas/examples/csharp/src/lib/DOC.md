# Reading-List Library

## Purpose

This module creates validated reading-list items with stable normalized slugs.

## Conventions

The library has no dependency on the executable module.

## Contents

- `Lib.csproj` configures its target-specific Atlas output through shared MSBuild properties.
- `ReadingListItem` is the public value produced by the library.
- `ReadingList` validates titles and creates items.
