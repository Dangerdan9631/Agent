import type { ValidationResult } from './validation';

export interface GenerateResult {
  configDir: string;
  outputDir: string;
  /** Effective target list (from options or config) */
  targets: string[];
  /** Non-empty when config validation failed; no files were written */
  validationErrors: ValidationResult[];
  /** Number of files written */
  fileCount: number;
}

export type GenerateEvent =
  | { type: 'generated'; result: GenerateResult }
  | { type: 'validation-error'; error: ValidationResult }
  | { type: 'watching'; configDir: string }
  | { type: 'change'; path: string }
  | { type: 'error'; error: unknown };
