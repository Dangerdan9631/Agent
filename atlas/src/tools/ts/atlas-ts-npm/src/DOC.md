# npm Integration Source

## Purpose

This directory contains npm-specific command forwarding for one configured package and no source-analysis behavior.

## Contents

- `AtlasTypeScriptNpmMain.ts` forwards package-local generation arguments to the CLI executable. The CLI reads only the current package's closed `atlas` mapping.
