import type { ValidationResult } from '../types/validation';

/**
 * Marker interface for all IR instruction types.
 *
 * Every built-in IR type (`InstructionFile`, `AgentDefinition`,
 * `HookDefinition`, `SkillDefinition`, `CommandDefinition`, …) as well as any
 * custom directive types added by plugins implement this interface.
 *
 * The `validate` method must confirm that the instance's data is internally
 * consistent — e.g. that required fields are present, enum values are in range,
 * and cross-field constraints are satisfied. It must **not** perform
 * agent-specific validation; that responsibility belongs to
 * {@link GeneratorPlugin} and {@link ImporterPlugin}.
 *
 * @example
 * // Implementing a custom instruction type:
 * class WorkflowDefinition implements InstructionType {
 *   constructor(public name: string, public steps: string[]) {}
 *
 *   validate(): ValidationResult[] {
 *     const results: ValidationResult[] = [];
 *     if (!this.name) {
 *       results.push({ level: 'error', message: 'Workflow name is required.' });
 *     }
 *     if (this.steps.length === 0) {
 *       results.push({ level: 'warning', message: 'Workflow has no steps.' });
 *     }
 *     return results;
 *   }
 * }
 */
export interface InstructionType {
  /**
   * Unique identifier for this instruction type (e.g. 'instruction', 'agent', 'skill').
   */
  readonly typeId: string;

  /**
   * Validates that this IR representation is internally self-consistent.
   *
   * Returns an array of {@link ValidationResult} objects. An empty array
   * indicates the instance is valid.
   */
  validate(): ValidationResult[];
}
