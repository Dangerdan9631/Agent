# Ruby Workspace Scripts

## Purpose

This directory contains the process adapter used by root npm commands to run
Bundler operations in the Ruby toolkit or example workspace.

## Conventions

- Resolve the selected Ruby project explicitly.
- Forward Bundler arguments and process exit codes without embedding Rake logic.
- Keep dependency and task definitions in Gemfiles and Rakefiles.

## Contents

- `RunBundler.mjs` locates Bundler and invokes it for a selected project.
