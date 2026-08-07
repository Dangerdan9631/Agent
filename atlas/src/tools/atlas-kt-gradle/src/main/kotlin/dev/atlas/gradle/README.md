# Atlas Gradle Integration

## Purpose

This package owns the Gradle plugin, task registration, Kotlin source extraction, and deterministic model-document serialization.

## Conventions

Tasks are responsible for Gradle lifecycle and outputs; extractors identify Kotlin declarations; document types serialize the shared contract. `KspFragmentElementLoader` consumes semantic target fragments when KSP is configured and falls back to source extraction otherwise. Do not introduce compiler-specific data into generated Atlas models.
