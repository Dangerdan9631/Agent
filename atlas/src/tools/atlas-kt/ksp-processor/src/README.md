# Atlas KSP Processor

## Purpose

This module is a KSP 2 `SymbolProcessorProvider` that creates target-local Atlas declaration fragments from semantic Kotlin symbols.

## Conventions

Apply this processor through explicit KSP target configurations such as `kspJvm`, `kspAndroid`, or `kspIosX64`. The fragment is intentionally language-neutral and must be aggregated into one owning artifact model by the Gradle integration.
