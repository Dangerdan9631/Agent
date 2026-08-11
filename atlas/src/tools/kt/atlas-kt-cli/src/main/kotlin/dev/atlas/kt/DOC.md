# Kotlin CLI Implementation

## Purpose

This directory contains the executable Kotlin command boundary and its YAML
document adapter. It translates command-line requests into SDK inputs without
placing filesystem or presentation concerns in the SDK.

## Conventions

Keep argument parsing, process output, and YAML persistence here. Delegate
language-model extraction and relationship analysis to `atlas-kt-sdk`.
