# Repository Workflow Report

## Scope

- Workflow type: Repository Onboarding
- Included paths: src/checkout
- Omitted paths: none

## Specify Output

- [spec.md](specs/001-active-checkout/spec.md)

## Evidence Summary

### Confirmed Facts

- ev-checkout: Checkout totals include tax (src/checkout/totals.ts:calculateTotal)

### Evidence Conflicts

- ev-conflict: Tax rounding differs between docs and code (docs/checkout.md#tax)

## Drift Findings

No drift findings for onboarding runs.

## Test Gaps

- checkout-tax-rounding (missing): living-specs/checkout.feature:Scenario Tax is rounded consistently

## Assumptions

- Checkout totals are user-facing behavior.

## Limitations

Living-spec and test files are not modified during repository onboarding specify.

## Recommended Next Steps

- clarify
- plan
- tasks
- implement
