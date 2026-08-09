# Deterministic Layout Application Domain

## Purpose

This directory computes and validates portable diagram layout documents independently of browser rendering.

## Conventions

- Equivalent graph and layout inputs produce byte-for-byte equivalent layout documents.
- Saved valid positions remain fixed unless force layout is explicitly requested.

## Contents

- `DeterministicLayoutService.ts` places diagram nodes using canonical dependency order.
- `model/` contains persisted layout documents and settings.
