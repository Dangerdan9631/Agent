# C# Generator Infrastructure

## Purpose

This directory adapts MSBuild, Roslyn, filesystem persistence, glob matching,
logging, and process output to the generator's local contracts.

## Conventions

- Keep machine-specific paths out of portable models.
- Resolve semantic facts through compiler symbols and retain safe labels when linking is ambiguous.
- Emit stable, schema-validated documents.

## Contents

- Discovery and evaluation adapters select SDK project targets.
- Extraction and linking adapters produce portable semantic graphs.
- Persistence, logging, and output adapters form the runtime boundaries.
- Generated document persistence converts internal compiler facts to the closed version-two schema.
