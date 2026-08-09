# Atlas Gradle Integration

## Purpose

This package owns the Gradle plugin, task registration, artifact identity,
semantic-fragment discovery, and isolated invocation of the standalone Kotlin
model generator.

## Conventions

Tasks are responsible for Gradle lifecycle and outputs. The module-model task
tracks Kotlin sources and KSP fragments as relative inputs, then passes both to
`atlas-kt`; the standalone tool remains responsible for extraction and shared
contract serialization. Do not introduce Gradle, KSP, or compiler-specific data
into generated Atlas models.
