# Validation Application Domain

## Purpose

This directory defines vendor-neutral dependency analysis results and architecture policy validation behavior.

## Conventions

- Analysis adapters expose normalized relationships rather than vendor report formats.
- Rule evaluators are small, independent implementations selected by declared rule type.
- Root rules receive inter-module facts; module rules receive facts originating in their owning module.

## Contents

- `model/` contains dependency relationships and actionable violations.
- `ports/` defines dependency analysis and rule evaluation boundaries.
- `ForbidRuleEvaluator.ts` enforces module-owned local, module, and external target prohibitions.
