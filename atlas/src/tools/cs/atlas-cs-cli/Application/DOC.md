# C# Generator Application

## Purpose

This directory coordinates one complete C# model-generation request without
depending on command-line or concrete process concerns.

## Conventions

- Keep orchestration ordered from configuration through persistence.
- Depend on focused adapters supplied by the composition root.

## Contents

- `GenerateCSharpModels` coordinates discovery, extraction, linking, and writing.
