# Ruby Rake Task Definitions

## Purpose

This directory defines the module-local `atlas:generate_model` task and its explicit Rake configuration.

## Conventions

- Translate Rake task execution into explicit CLI commands.
- Keep task prerequisites configuration-driven and free of analysis behavior.
- Propagate command failures through normal Rake failure semantics.

## Contents

- `rake.rb` exposes `Atlas::Rake.configure` and installs model generation without invoking project-level Atlas behavior.
- `rake_configuration.rb` validates the exact gemspec, source roots, route files, output, and build hook settings.
