# TypeScript Generator Presentation

## Purpose

This directory owns command parsing and the Node.js process entry point for
`atlas-ts`.

## Conventions

Presentation types translate arguments into application options and contain no
source-analysis behavior.

## Contents

- `AtlasTypeScriptCli.ts` parses the dedicated command surface.
- `AtlasTypeScriptCliMain.ts` composes and runs the executable.
