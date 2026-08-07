# Atlas Kotlin Gradle Plugin

## Purpose

This Gradle plugin generates one language-neutral Atlas module model for each selected Kotlin artifact and aggregates them into a workspace manifest. Its companion KSP 2 processor lives in `ksp-processor` and produces target-local semantic fragments.

## Usage

Apply `dev.atlas.kotlin` to a Kotlin JVM project. The plugin adds `atlasGenerateModels`, `atlasGenerateManifest`, `atlasValidate`, `atlasGenerate`, and `atlasView`; generation attaches to `build` unless `atlas.generateOnBuild` is false.

For KSP 2 builds, the plugin injects the companion processor into each selected target (`kspJvm`, `kspAndroid`, `kspJs`, or a named Native target) and supplies its artifact arguments. Set `atlas.kspProcessorDependency` when consuming a locally published processor. KSP 2 deliberately requires target-specific configurations; do not use the deprecated catch-all `ksp` configuration.

## Current scope

The Gradle plugin currently aggregates JVM source models and target-local KSP fragments. The KSP companion supplies semantic extraction for Android, JS/Wasm, Native, and multiplatform builds when those targets configure KSP.
