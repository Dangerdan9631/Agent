import type { IR } from './ir';
import type { AgentConfig } from './config';

/** A file to be written to the output directory */
export interface FileOutput {
  /** Path relative to the output directory, using forward slashes */
  path: string;
  content: string;
}

/** Input passed to every generator's `generate()` method */
export interface GeneratorInput {
  ir: IR;
  config: AgentConfig;
  /** The specific target ID being generated (e.g. `"copilot"`, `"cursor-cli"`) */
  target: string;
}

/** Plugin interface — implement this to add a new generation target */
export interface AgentGenerator {
  /** Unique target identifier registered in the registry (e.g. `"copilot"`) */
  readonly target: string;
  /** Human-readable name shown in `list-targets` output */
  readonly displayName: string;
  generate(input: GeneratorInput): FileOutput[];
}
