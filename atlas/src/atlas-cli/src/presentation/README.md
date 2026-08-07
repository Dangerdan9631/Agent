# Presentation Layer

## Purpose

This directory translates command-line input into Atlas workflow requests and renders user-facing command results.

## Conventions

- Keep framework parsing details at the boundary.
- Do not place architecture policy or filesystem behavior in this layer.

## Contents

- `cli/` contains the executable command-line adapter.
