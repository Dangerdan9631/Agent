# Atlas Tools

## Purpose

This directory contains language-specific model generators and their build-tool
adapters. Tools produce the language-neutral module-model contract consumed by
`atlas-cli`.

## Contents

- `atlas-ts` generates models from TypeScript workspaces.
- `atlas-kt` generates models from Kotlin source and KSP fragments.
- `atlas-kt-gradle` integrates Kotlin generation, validation, diagrams, and viewing with Gradle.
