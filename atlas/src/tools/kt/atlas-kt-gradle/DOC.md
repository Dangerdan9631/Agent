# Atlas Kotlin Gradle Plugin

## Purpose

This Gradle plugin generates one language-neutral Atlas module model for each
explicitly registered Kotlin target. Its companion `atlas-kt-ksp` processor can
produce target-local semantic fragments supplied by that registration.

## Usage

Apply `dev.atlas.kotlin` to each analyzed project and register exact target,
compilation, model file, and optional semantic fragment inputs under
`atlas.models`. Each registration creates `atlasGenerate<Name>Model` and joins
the owning build unless its `generateOnBuild` is false. The plugin never applies
itself to subprojects or enumerates targets.

## Current scope

Source extraction covers nested Kotlin declarations and portable imports,
references, inheritance, and implementation relationships. KSP fragments refine
those relationships with resolved names while the emitted module model remains
platform-neutral. The companion can contribute semantics for Android, JS/Wasm,
Native, and multiplatform targets when those targets configure KSP.
