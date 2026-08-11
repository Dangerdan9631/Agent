# Atlas Tools

## Purpose

This directory contains language-specific model generators and their build-tool
adapters. Tools produce the language-neutral module-model contract consumed by
`atlas-cli`.

## Contents

- `ts` contains the TypeScript SDK, CLI, and npm integration packages.
- `kt` contains the Kotlin SDK, CLI, KSP processor, and Gradle integration packages.
- `cs` contains the C# SDK, CLI, and MSBuild integration packages.
- `rb` contains the Ruby SDK, CLI, and Rake integration gems.

## Build

The `kt/` directory owns the Gradle wrapper for all four Kotlin tool modules.
From that directory:

```text
./gradlew build
./gradlew test
```

From the repository root, `npm run build:kotlin` and `npm run test:kotlin`
invoke the same wrapper through `kt/atlas-kt-gradle/scripts/RunGradle.mjs`.
Ruby dependencies and tasks are available through `npm run install:ruby`,
`npm run build:ruby`, and `npm run test:ruby`.
C# builds and tests are available through `npm run build:csharp` and
`npm run test:csharp`.
