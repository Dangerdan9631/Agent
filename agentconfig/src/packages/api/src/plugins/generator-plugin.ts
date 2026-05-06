import type { ValidationResult } from '../types/validation';
import type { InstructionType } from './instruction-type';
import type { AgentConfigContext } from './context';

/**
 * Plugin interface for generating agent-native output from an IR instruction type.
 *
 * A `GeneratorPlugin` is bound to a specific agent target (e.g. `"copilot"`,
 * `"cursor"`) and a specific IR type `T`. It is responsible for:
 *
 * 1. Declaring which agent target it generates output for (`agent`).
 * 2. Agent-specific validation of an individual IR item **before** generation
 *    (`validate`).
 *
 * The type parameter `T` must extend {@link InstructionType} so that any
 * concrete IR type — built-in or custom — can be targeted.
 *
 * @typeParam T - The IR instruction type this plugin generates output for.
 *
 * @example
 * export const CopilotInstructionGenerator: GeneratorPlugin<InstructionFile> = {
 *   agent: 'copilot',
 *
 *   validate(instruction) {
 *     const results: ValidationResult[] = [];
 *     if (!instruction.body.trim()) {
 *       results.push({ level: 'error', message: 'Instruction body is empty.' });
 *     }
 *     return results;
 *   },
 *
 *   generate(projectRoot, items, context) {
 *     const dest = path.join(projectRoot, '.github', 'copilot-instructions.md');
 *     fs.writeFileSync(dest, items[0].body);
 *   },
 * };
 */
export interface GeneratorPlugin<T extends InstructionType> {
  /**
   * The unique agent target identifier this plugin generates output for.
   *
   * Must match the target identifier used in the generator registry
   * (e.g. `"copilot"`, `"cursor-cli"`, `"codex"`).
   */
  readonly agent: string;

  /**
   * The typeId of the InstructionType this plugin generates (e.g. 'instruction', 'agent').
   */
  readonly instructionType: string;

  /**
   * Validates that the given instruction items are valid for generation targeting
   * {@link agent}.
   *
   * @param items       - The instruction items to validate for this agent target.
   * @param context     - The execution context containing the plugin registry.
   */
  validate(items: T[], context: AgentConfigContext): ValidationResult[];

  /**
   * Generates agent-native output for the given instruction items and writes it to disk.
   *
   * Implementations should write all files produced from `items` directly into
   * (or beneath) `projectRoot` using the agent's expected directory layout.
   *
   * @param projectRoot - Absolute path to the root output directory.
   * @param items       - The instruction items to generate output from.
   * @param context     - The execution context containing the plugin registry.
   */
  generate(projectRoot: string, items: T[], context: AgentConfigContext): void;
}
