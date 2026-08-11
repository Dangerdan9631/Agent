# Atlas Tools

## Purpose

This directory contains language-specific model generators and their build-tool
adapters. Tools produce the language-neutral module-model contract consumed by
`atlas-cli`.

## Contents

- `atlas-ts` generates models from TypeScript workspaces.
- `atlas-kt` generates models from Kotlin source and KSP fragments.
- `atlas-kt-gradle` integrates Kotlin generation, validation, diagrams, and viewing with Gradle.
- `atlas-cs` generates Roslyn-backed models and provides opt-in MSBuild targets.
- `atlas-rb` generates models from Ruby and literal Rails source conventions.

## Build

This directory owns a Gradle wrapper for the Kotlin toolchain (`atlas-kt` and
`atlas-kt-gradle`). From this directory:

```text
./gradlew build
./gradlew test
```

From the repository root, `npm run build:kotlin` and `npm run test:kotlin`
invoke the same wrapper through `atlas-kt-gradle/scripts/RunGradle.mjs`.
Ruby dependencies and tasks are available through `npm run install:ruby`,
`npm run build:ruby`, and `npm run test:ruby`.
C# builds and tests are available through `npm run build:csharp` and
`npm run test:csharp`.
