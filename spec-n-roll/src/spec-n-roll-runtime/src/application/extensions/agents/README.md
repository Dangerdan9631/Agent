# Agent extension sources

This directory contains the bundled source modules installed for supported coding agents. Each source type owns one agent's native extension module so its generated behavior can be reviewed independently.

## Conventions

### Readable module sources

Write generated module text as a multiline template literal. Keep each agent's source in its own file and avoid shared source templates that hide agent-specific behavior.
