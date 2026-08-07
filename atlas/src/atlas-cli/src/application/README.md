# Application Layer

## Purpose

This directory will contain Atlas workflows and the vendor-neutral models that express architecture policy, semantic graphs, diagrams, and layouts.

## Conventions

- Depend only on narrow local interfaces and immutable models.
- Keep command workflows focused on orchestration rather than filesystem, compiler, or HTTP details.
- Log important policy and configuration decisions through injected logging interfaces.

## Contents

- `shared/` contains cross-domain application contracts such as logging and runtime output.
