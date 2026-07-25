# Project initialization domain

This directory contains the application boundary and argument resolution for creating a project-local Spec-N-Roll runtime installation.

## Conventions

Keep command syntax and initialization intent independent of Node.js filesystem APIs. Concrete copying and launcher creation belong to infrastructure adapters.

The direct `init` command accepts a repeatable `--agent <name>` flag for bundled agent selection. When it is absent, preserve the default installation of every bundled agent; reject unsupported names before filesystem work begins.
