import type { ArchitectureViolation } from '#application/validation/model/ArchitectureViolation.js';

/**
 * Captures the complete deterministic result of applying declared architecture rules.
 */
export class ArchitectureValidationResult {
  /**
   * Creates validation outcome data from sorted actionable violations.
   *
   * @param violations - Violations sorted by rule, source, target, and message.
   */
  public constructor(public readonly violations: readonly ArchitectureViolation[]) {}

  /**
   * Indicates whether an error-severity rule violation must fail the command.
   *
   * @returns True when at least one error-severity violation exists.
   */
  public hasErrors(): boolean {
    return this.violations.some((violation) => violation.severity === 'error');
  }
}
