# Atlas Viewer Assets

## Purpose

This directory contains the browser entry point and build configuration inputs for Atlas-generated diagram viewer assets.

## Conventions

- Browser rendering remains separate from application layout and architecture-policy behavior.
- Generated diagram HTML may embed graph data while future interactive controls consume the same persisted artifact formats.

## Contents

- `main.tsx` mounts the browser viewer entry point.
- `index.html` provides the Vite build document shell.
