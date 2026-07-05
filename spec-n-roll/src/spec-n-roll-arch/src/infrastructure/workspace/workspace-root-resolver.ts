import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolves the repository root for architecture generation.
 */
export class WorkspaceRootResolver {
  /**
   * Finds the repository root by walking upward from this package.
   *
   * @returns The absolute path to the repository root.
   */
  resolve(): string {
    return resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  }
}
