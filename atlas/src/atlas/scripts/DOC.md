# Atlas Desktop Build Scripts

## Purpose

This directory contains process adapters used to launch and package the Atlas
Electron desktop application.

## Conventions

- Keep Electron application behavior under `src/main`.
- Resolve workspace packages and executable paths without hard-coded machines.
- Forward child process failures to the invoking npm command.

## Contents

- `AtlasElectronLauncher.mjs` locates Electron and starts the desktop host.
