# Atlas Kotlin Gradle Plugin

## Purpose

This Gradle plugin generates one language-neutral Atlas module model for each selected Kotlin artifact and aggregates them into a workspace manifest. Its companion KSP 2 processor lives in `ksp-processor` and produces target-local semantic fragments.

## Usage

Apply `dev.atlas.kotlin` to a Kotlin JVM project. The plugin adds `atlasGenerateModels`, `atlasGenerateManifest`, `atlasValidate`, `atlasGenerate`, and `atlasView`; generation attaches to `build` unless `atlas.generateOnBuild` is false.

`atlasView` forwards the generated workspace manifest, configuration, and Gradle root to the shared Electron host so interactive policy changes regenerate the same Kotlin model workspace.

For KSP 2 builds, the plugin injects the companion processor into each selected
target (`kspJvm`, `kspAndroid`, `kspJs`, or a named Native target), supplies its
artifact arguments, waits for KSP, and passes every generated
`*.atlas-fragment.json` file to the standalone generator. Set
`atlas.kspProcessorDependency` when consuming a locally published processor. KSP
2 deliberately requires target-specific configurations; do not use the
deprecated catch-all `ksp` configuration.

## Current scope

Source extraction covers nested Kotlin declarations and portable imports,
references, inheritance, and implementation relationships. KSP fragments refine
those relationships with resolved names while the emitted module model remains
platform-neutral. The companion can contribute semantics for Android, JS/Wasm,
Native, and multiplatform targets when those targets configure KSP.
