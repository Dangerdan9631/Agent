/**
 * Records how one ordered manifesto reference resolved for a step attempt.
 */
export interface ManifestoProvenance {
  /**
   * Stable manifesto identity.
   */
  readonly id: string;
  /**
   * Requested version.
   */
  readonly version: string;
  /**
   * Zero-based global-then-step load position.
   */
  readonly order: number;
  /**
   * Scope that contributed the reference.
   */
  readonly scope: 'global' | 'step';
  /**
   * Resolution and load outcome.
   */
  readonly outcome: 'loaded' | 'skipped' | 'blocked';
  /**
   * Diagnostic for skipped or blocked outcomes.
   */
  readonly message?: string;
}
