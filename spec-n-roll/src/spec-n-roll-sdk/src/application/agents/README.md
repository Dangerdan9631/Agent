# Agent SDK application domain

This directory contains the SDK capability for reading the registered agent
extensions in a project. It translates a passive registration boundary into a
stable, ordered list without knowing where project configuration is stored.

## Conventions

### Passive listing

Agent listing reports registered names and enabled state only. It must not load,
instantiate, or execute agent extension modules.
