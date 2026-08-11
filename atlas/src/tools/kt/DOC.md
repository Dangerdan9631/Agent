# Kotlin Tools

## Purpose

This directory contains the Kotlin source SDK, CLI, KSP processor, and Gradle integration as independently built modules.

## Contents

- `atlas-kt-sdk` owns process-independent Kotlin source analysis.
- `atlas-kt-cli` owns argument parsing and YAML model-file output.
- `atlas-kt-ksp` emits compiler-resolved semantic fragments.
- `atlas-kt-gradle` wires Atlas tasks into Gradle workspaces.
