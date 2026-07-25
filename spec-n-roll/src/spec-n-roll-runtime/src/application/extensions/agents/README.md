# Agent extension sources

This directory contains the neutral built-in skill definition and bundled source modules installed for supported coding agents. Each agent source owns translation into its native artifacts while the definition remains independent of native formats.

## Conventions

### Readable module sources

Write generated module text as a multiline template literal. Keep each agent's source in its own file so native translation behavior can be reviewed independently.

### Neutral definitions

Define built-in capability intent, data shapes, instruction source, and requirements once. Native renderers may add agent-specific metadata but must not change the neutral capability semantics.
