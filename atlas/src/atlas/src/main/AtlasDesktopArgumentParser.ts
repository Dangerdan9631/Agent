/**
 * Parses Atlas desktop command-line input while retaining compatibility with the legacy `view` flow.
 */
export class AtlasDesktopArgumentParser {
  /**
   * Converts user-supplied desktop arguments into validated workspace and listener options.
   *
   * @param argumentsToParse - Arguments supplied after the Electron application path.
   * @returns Validated launch options for one hosted artifact workspace.
   */
  public parse(argumentsToParse: readonly string[]): AtlasDesktopLaunchOptions {
    const values = [...argumentsToParse];
    const options: MutableAtlasDesktopLaunchOptions = {};
    if (values[0] === 'view') {
      values.shift();
    } else if (values[0] === 'images') {
      values.shift();
      options.generateImages = true;
    }
    while (values.length > 0) {
      const argument = values.shift()!;
      if (argument === '--open' || argument === '--no-open') continue;
      if (argument === '--config') {
        options.configurationPath = this.readValue(argument, values);
        continue;
      }
      if (argument === '--workspace') {
        options.workspacePath = this.readValue(argument, values);
        continue;
      }
      if (argument === '--output') {
        options.outputPath = this.readValue(argument, values);
        continue;
      }
      if (argument === '--host') {
        options.host = this.readValue(argument, values);
        continue;
      }
      if (argument === '--port') {
        options.port = this.readPort(this.readValue(argument, values));
        continue;
      }
      if (!argument.startsWith('-') && options.configurationPath === undefined) {
        options.configurationPath = argument;
        continue;
      }
      throw new Error(`Atlas desktop does not recognize argument '${argument}'.`);
    }
    return options;
  }

  /** Reads the required value immediately following one named option. */
  private readValue(option: string, values: string[]): string {
    const value = values.shift();
    if (value === undefined || value.startsWith('-')) {
      throw new Error(`Atlas desktop ${option} requires a value.`);
    }
    return value;
  }

  /** Converts a raw port option into the supported TCP range. */
  private readPort(value: string): number {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 0 || port > 65_535) {
      throw new Error('Atlas desktop --port must be an integer from 0 through 65535.');
    }
    return port;
  }
}

/**
 * Allows the parser to build one launch option value before exposing it as immutable state.
 */
interface MutableAtlasDesktopLaunchOptions {
  /**
   * Whether the desktop host must export all diagram images without creating a visible window.
   */
  generateImages?: true | undefined;
  /** Optional workspace root override. */
  workspacePath?: string | undefined;
  /** Optional Atlas configuration path override. */
  configurationPath?: string | undefined;
  /** Optional artifact output path override. */
  outputPath?: string | undefined;
  /** Optional local listener hostname. */
  host?: string | undefined;
  /** Optional local listener port. */
  port?: number | undefined;
}
import type { AtlasDesktopLaunchOptions } from '#main/AtlasDesktopLaunchOptions.js';
