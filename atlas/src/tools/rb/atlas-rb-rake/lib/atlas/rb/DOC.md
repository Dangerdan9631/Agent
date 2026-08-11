# Ruby Rake Task Definitions

## Purpose

This directory defines the `atlas:*` tasks exposed to Ruby workspaces.

## Conventions

- Translate Rake task execution into explicit CLI commands.
- Keep task prerequisites configuration-driven and free of analysis behavior.
- Propagate command failures through normal Rake failure semantics.

## Contents

- `rake.rb` installs generation, validation, and viewing tasks.
