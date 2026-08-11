# Atlas Ruby Library

## Purpose

This directory implements Ruby workspace discovery, Prism extraction, portable
model linking, deterministic persistence, and the command boundary.

## Conventions

- Each file owns one principal class or module.
- Filesystem, parser, schema, and output concerns remain behind focused types.
- Model records use only the portable Atlas version-one vocabulary.

## Contents

- `atlas/rb/` contains the generator implementation.
- `atlas/rb.rb` loads the public library surface.
