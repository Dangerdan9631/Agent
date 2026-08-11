# Kotlin SDK Implementation

## Purpose

This directory implements Kotlin source extraction, model identity, semantic
fragment merging, relationship resolution, and portable model contracts.

## Conventions

Keep this layer independent of Gradle, KSP, command-line parsing, and artifact
persistence. Public SDK behavior must operate on explicit request and result
types.
