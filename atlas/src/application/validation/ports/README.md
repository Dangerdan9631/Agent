# Validation Ports

## Purpose

This directory defines application boundaries for normalized dependency analysis and independent rule evaluation.

## Conventions

- Ports expose only Atlas models and configuration types.
- Vendor reporting formats stay in infrastructure adapters.

## Contents

- `DependencyAnalyzer.ts` defines workspace dependency analysis.
- `ArchitectureRuleEvaluator.ts` defines a focused rule implementation contract.
- `ArchitectureValidationWorkflow.ts` defines complete validation command execution.
- `DependencyAnalysisArtifactWriter.ts` defines raw report persistence.
