# Reading-List Application Gem

## Purpose

This executable gem accepts a title, delegates item creation to the library,
and renders the normalized title and slug.

## Conventions

The executable owns command parsing and output while domain behavior stays in
the library gem.

## Contents

- `ReadingListCommand` coordinates library use and terminal rendering.
- `Program` composes the command and translates process arguments.
