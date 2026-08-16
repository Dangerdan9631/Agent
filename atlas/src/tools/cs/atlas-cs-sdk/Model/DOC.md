# C# Generator Model

## Purpose

This directory contains portable Atlas document values and the target-specific
intermediate values used during C# extraction and linking.

## Conventions

- Keep records immutable and free of Roslyn or MSBuild types.
- Represent deferred relationship targets with compiler-qualified names.

## Contents

- Atlas records mirror the canonical module schema. Legacy workspace-manifest records
  remain public SDK compatibility values and are not emitted by version-two generators.
- C# target and extraction records carry generation state between adapters.
