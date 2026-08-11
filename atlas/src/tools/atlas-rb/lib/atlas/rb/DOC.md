# Atlas Ruby Implementation

## Purpose

This directory contains the focused types that discover Ruby workspaces,
extract source facts, build Atlas models, and write validated artifacts.

## Conventions

- Keep Prism-specific behavior inside the syntax reader and parser boundary.
- Keep framework conventions separate from language syntax extraction.
- Inject filesystem-adjacent, logging, schema, and output dependencies through
  the composition root.

## Contents

- Discovery and configuration types resolve Ruby modules and source roots.
- Extraction and model-building types translate Ruby and Rails facts.
- CLI and persistence types validate and publish deterministic artifacts.
