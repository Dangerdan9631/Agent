# C# Example Projects

## Purpose

This directory contains the runtime projects modeled by the C# Atlas example.

## Conventions

- Project references follow the clean-architecture dependency direction.
- Each source file owns one principal top-level declaration.
- Framework and persistence details remain outside the domain and application layers.

## Contents

- `Domain/` contains catalog business concepts.
- `Application/` contains ports and use cases.
- `Infrastructure/` contains JSON and persistence adapters.
- `App/` contains composition and user-facing output.

