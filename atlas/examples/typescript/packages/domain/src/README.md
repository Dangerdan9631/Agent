# Domain source

## Purpose

This directory owns the framework-independent catalog model and policies.

## Conventions

- Keep dependencies inside the domain package.
- Construct catalog items through domain validation and normalization behavior.
- Represent real specialization with inheritance and explicit item kinds.

## Contents

- `catalog` contains item identities, drafts, policies, specializations, and factories.
- `index.ts` publishes the intentionally small package API.
