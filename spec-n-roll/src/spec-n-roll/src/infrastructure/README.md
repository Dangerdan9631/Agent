# Dispatcher infrastructure layer - src/spec-n-roll/src/infrastructure

This directory contains concrete adapters for operating-system, filesystem, metadata, and process concerns. It implements boundaries used by dispatcher application behavior.

## Conventions

### Adapter isolation

Keep platform and vendor APIs behind classes in this layer. Application classes should see only local interfaces and stable data contracts.
