# Atlas KSP Processor

## Purpose

This module is a KSP 2 `SymbolProcessorProvider` that creates target-local Atlas
declaration fragments from semantic Kotlin symbols. Fragments carry neutral
declaration kinds and traits plus resolved reference, inheritance, and
implementation target names.

## Conventions

Apply this processor through explicit KSP target configurations such as `kspJvm`,
`kspAndroid`, or `kspIosX64`. The fragment is intentionally language-neutral and
is consumed by the standalone Kotlin generator through the Gradle integration.
It augments source-derived records; it is not a second module-model format.
