# C# Generator Presentation

## Purpose

This directory owns command parsing, usage text, exit statuses, and the handoff
to the generation application.

## Conventions

- Keep process output behind the dedicated runtime writer.
- Map invalid input and generation failures to distinct exit statuses.

## Contents

- `AtlasCsCli` implements the `atlas-cs generate` command boundary.
