# Federated Model Application Domain

## Purpose

This directory defines the language-neutral module model, manifest, and resolved workspace contracts.

## Conventions

- Module IDs are opaque and model files never locate each other.
- `sourceLanguage` is presentation metadata and has no validation or linking semantics.

## Contents

- `model/` defines portable YAML document contracts and resolved identities.
- `ports/` defines manifest loading at the infrastructure boundary.
