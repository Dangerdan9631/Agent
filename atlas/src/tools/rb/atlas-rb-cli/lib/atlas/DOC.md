# Ruby CLI Namespace Loader

## Purpose

This directory contains the CLI gem's namespace loader and its implementation
namespace.

## Conventions

- Keep the loader declarative and free of command execution.
- Place implementation types beneath `rb`.
- Load SDK dependencies before exposing CLI composition types.

## Contents

- `rb.rb` defines the CLI gem's public load surface.
- `rb/` contains command and adapter implementations.
