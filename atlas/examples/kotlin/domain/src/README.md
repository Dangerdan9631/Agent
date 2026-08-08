# Domain source tree

## Purpose

This source tree owns the framework-independent Kotlin catalog model and policies.

## Conventions

- Keep dependencies inside the domain module.
- Construct catalog items through domain validation and normalization behavior.
- Represent real specialization with inheritance and explicit item kinds.

## Contents

- `main/kotlin/dev/atlas/example/domain/catalog` contains item identities, drafts, policies, specializations, and factories.
