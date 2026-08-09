# Validation Infrastructure

## Purpose

This directory adapts dependency-cruiser output into portable Atlas dependency relationships.

## Conventions

- Do not expose dependency-cruiser types outside this infrastructure boundary.
- Convert resolved workstation paths to workspace-relative paths before returning data.

## Contents

- `DependencyCruiserAnalyzer.ts` invokes and normalizes dependency-cruiser analysis.
