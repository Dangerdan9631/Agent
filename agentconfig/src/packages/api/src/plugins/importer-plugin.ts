import type { ValidationResult } from '../types/validation';
import type { InstructionType } from './instruction-type';
import type { AgentConfigContext } from './context';

/**
 * Plugin interface for importing agent-native source files into an IR
 * instruction type.
 *
 * An `ImporterPlugin` is bound to a specific agent target (e.g. `"copilot"`,
 * `"cursor"`) and a specific IR type `T`. It is responsible for:
 *
 * 1. Declaring which agent target it imports from (`agent`).
 * 2. Agent-specific validation of a source folder path **before** import
 *    begins (`validate`).
 *
 * The type parameter `T` must extend {@link InstructionType} so that any
 * concrete IR type — built-in or custom — can be the import target.
 *
 * @typeParam T - The IR instruction type this plugin produces on import.
 *
 * @example
 * export const CopilotInstructionImporter: ImporterPlugin<InstructionFile> = {
 *   agent: 'copilot',
 *
 *   validate(sourceDir) {
 *     const results: ValidationResult[] = [];
 *     const instructionsPath = path.join(sourceDir, '.github', 'copilot-instructions.md');
 *     if (!fs.existsSync(instructionsPath)) {
 *       results.push({
 *         level: 'error',
 *         message: `Expected Copilot instructions file not found: ${instructionsPath}`,
 *         file: instructionsPath,
 *       });
 *     }
 *     return results;
 *   },
 *
 *   import(sourceDir, context) {
 *     const raw = fs.readFileSync(
 *       path.join(sourceDir, '.github', 'copilot-instructions.md'),
 *       'utf8',
 *     );
 *     return [{ name: 'copilot-instructions', sourcePath: sourceDir, body: raw, ... }];
 *   },
 * };
 */
export interface ImporterPlugin<T extends InstructionType> {
  /**
   * The unique agent target identifier this plugin imports from.
   *
   * Must match the target identifier used in the importer registry
   * (e.g. `"copilot"`, `"cursor-cli"`, `"codex"`).
   */
  readonly agent: string;

  /**
   * The typeId of the InstructionType this plugin imports (e.g. 'instruction', 'agent').
   */
  readonly instructionType: string;

  /**
   * Validates that the given folder path contains the source files required
   * for import targeting {@link agent}.
   *
   * This method performs **agent-specific** pre-flight checks, such as
   * confirming that expected sentinel files or directories exist, that the
   * folder layout matches the agent's conventions, or that required metadata
   * fields can be found before any parsing occurs.
   *
   * Returns an array of {@link ValidationResult} objects. An empty array
   * indicates the folder is ready for import.
   *
   * @param sourceDir - Absolute path to the folder to be imported.
   * @param context   - The execution context containing the plugin registry.
   */
  validate(sourceDir: string, context: AgentConfigContext): ValidationResult[];

  /**
   * Imports agent-native files from `folderPath` and returns them as
   * normalized IR items of type `T`.
   *
   * This method is called after {@link validate} confirms the folder is ready.
   * Implementations should parse all relevant agent files found under
   * `folderPath` and map them into the IR shape described by `T`.
   *
   * @param folderPath - Absolute path to the folder to import from.
   * @param context    - The execution context containing the plugin registry.
   * @returns An array of normalized instruction items parsed from the agent's files.
   */
  import(folderPath: string, context: AgentConfigContext): Promise<T[]>;
}

