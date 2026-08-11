# Ruby Example Scripts

## Purpose

This directory contains verification behavior specific to the generated Ruby
example artifacts.

## Conventions

- Validate persisted artifacts without depending on Atlas implementation details.
- Keep expected example semantics explicit and deterministic.
- Raise actionable failures when a generated graph is incomplete or inconsistent.

## Contents

- `ruby_example_graph_verifier.rb` validates graph, layout, and semantic edge integrity.
