# C# Atlas Build Project

## Purpose

This directory contains the designated orchestration project that exposes Atlas
generation, validation, and viewing targets for the C# example workspace.

## Conventions

- Keep application behavior in `src/app` and `src/lib`.
- Keep this project limited to workspace build and Atlas target wiring.
- Reference the packaged MSBuild integration instead of duplicating its tasks.

## Contents

- `Atlas.Example.csproj` imports the Atlas MSBuild targets and coordinates the
  two application modules.
