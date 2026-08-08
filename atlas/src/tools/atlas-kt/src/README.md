# Atlas Kotlin CLI Source

## Purpose

This directory implements the standalone Kotlin module-model generator. It
accepts source roots and artifact identity from a build adapter and writes only
the portable Atlas JSON contracts.

The generator parses Kotlin PSI to preserve the declaration tree from namespace
and source unit through nested classes, interfaces, objects, enums, annotations,
type aliases, functions, methods, constructors, properties, and constants. It
derives safe import, reference, inheritance, and implementation relationships;
owned targets use element IDs while unresolved targets remain labels.

Repeated `--semantic-fragment` arguments add KSP-resolved relationship facts.
Fragments refine the portable source model and never expose KSP objects or
compiler filesystem roots in the generated contract.

## Conventions

Source extraction remains independent of Gradle APIs. Source paths are normalized
relative to the owning module, identities are deterministic, and JSON output is
stable for identical inputs. Gradle-specific identity, task, and process concerns
belong in `atlas-kt-gradle`.
