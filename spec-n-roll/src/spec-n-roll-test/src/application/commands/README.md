# Test support commands domain - src/spec-n-roll-test/src/application/commands

This directory contains command helper contracts and argument-list factories. It models executable test workflows without owning process implementation details.

## Conventions

### Command helpers

Keep command contracts narrow and argument construction explicit. Concrete command execution belongs in infrastructure.
