# Ruby Example Application Implementation

## Purpose

This directory implements the executable program and command that consume the
public reading-list library types.

## Conventions

- Construct library behavior through its public API.
- Keep command-specific dependencies out of the reusable library gem.
- Route designed user output through the executable boundary.

## Contents

- `program.rb` composes and runs the application.
- `reading_list_command.rb` validates input and invokes the library.
