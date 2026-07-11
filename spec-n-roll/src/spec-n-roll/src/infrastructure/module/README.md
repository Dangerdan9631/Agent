# Dispatcher module infrastructure - src/spec-n-roll/src/infrastructure/module

This directory contains Node module-resolution adapters for the dispatcher. It resolves package files without interpreting their contents.

## Conventions

### Raw module paths

Return resolved paths only. Application services read and parse package manifests through their own ports.
