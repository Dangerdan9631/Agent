import type { CerebrateDefinition } from '../../domain/cerebrate/cerebrate-definition.js';

export interface CerebrateDefinitionReader {
  read(cerebrateDir: string): CerebrateDefinition;
}
