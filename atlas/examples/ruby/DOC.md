# Atlas Ruby Example

## Purpose

This workspace demonstrates Ruby gem discovery, Rails conventions, cross-gem
linking, validation, and diagram generation through the portable Atlas manifest.

## Conventions

- Domain declarations remain independent of Rails behavior.
- Application and web gems depend inward through explicit Ruby constants.
- Source files are analyzed but are not executed by the example build.

## Contents

- `gems/` contains domain, application, and web artifacts.
- `atlas.config.json` defines package policy, layers, diagrams, and rules.
- `Rakefile` generates models, final Atlas artifacts, and verifies every graph.
- `scripts/` validates graph structure, layout coverage, and expected semantic edges.
