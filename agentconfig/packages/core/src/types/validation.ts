export type ValidationLevel = 'error' | 'warning' | 'info';

export interface ValidationResult {
  level: ValidationLevel;
  message: string;
  /** Absolute path to the source file that triggered this result (if applicable) */
  file?: string;
}
