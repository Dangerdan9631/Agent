# Kotlin Symbol Processor

## Purpose

This directory contains the KSP adapter that records semantic declaration and
relationship facts as portable YAML fragments.

## Conventions

Keep KSP types inside this boundary. Fragment documents must remain stable,
language-neutral inputs for the standalone Kotlin CLI and SDK pipeline.
