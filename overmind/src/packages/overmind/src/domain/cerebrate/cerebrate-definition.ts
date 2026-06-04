import type { CerebrateCommand } from './cerebrate-command.js';

export interface CerebrateDefinition {
  name: string;
  description: string;
  taskId: string;
  responsibilities: string;
  commands: CerebrateCommand[];
  cerebrateDir: string;
}
