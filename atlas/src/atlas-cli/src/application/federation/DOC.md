# Federated Model Application Domain

## Purpose

This directory defines language-neutral module models and the resolved configured workspace contract.

## Conventions

- Module IDs are opaque and model files never locate each other.
- `sourceLanguage` is presentation metadata and has no validation or linking semantics.

## Contents

- `model/` defines portable YAML document contracts and resolved identities.
- `ports/` defines explicit configured-model loading at the infrastructure boundary.
