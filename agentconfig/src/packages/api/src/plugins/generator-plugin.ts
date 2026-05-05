import type { ValidationResult } from '../types/validation';
import type { InstructionType } from './instruction-type';

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
 *   generate(folderPath, instruction) {
 *     const dest = path.join(folderPath, '.github', 'copilot-instructions.md');
 *     fs.writeFileSync(dest, instruction.body);
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
   * Validates that the given IR item is valid for generation targeting
   * {@link agent}.
   *
   * This method performs **agent-specific** validation on top of any
   * structural validation already enforced by
   * {@link InstructionType.validate}. Typical checks include verifying that
   * agent-required fields are set, that unsupported features are absent, or
   * that values are within the constraints imposed by the target agent.
   *
   * Returns an array of {@link ValidationResult} objects. An empty array
   * indicates the item is ready for generation.
   *
   * @param item - The IR item to validate for this agent target.
   */
  validate(item: T): ValidationResult[];

  /**
   * Generates agent-native output for the given IR item and writes it into
   * `folderPath`.
   *
   * Implementations should write all files produced from `item` directly into
   * (or beneath) `folderPath` using the agent's expected directory layout.
   *
   * @param folderPath - Absolute path to the root output directory.
   * @param item       - The IR item to generate output from.
   */
  generate(folderPath: string, item: T): void;
}
