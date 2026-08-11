# Reading-List Application

## Purpose

This executable accepts a title, delegates item creation to the library, and
prints the resulting normalized title and slug.

## Conventions

Command-line validation and rendering remain at the executable boundary.

## Contents

- `ReadingListCommand` coordinates validation, library use, and output.
- `Program` composes and runs the command.
