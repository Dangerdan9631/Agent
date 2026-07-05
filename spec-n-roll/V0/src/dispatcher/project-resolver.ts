import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * The name of the Spec-N-Roll project directory.
 */
export const SPEC_N_ROLL_DIR = '.spec-n-roll';

/**
 * Finds the nearest project root.
 *
 * @param startDir - The directory to start searching from.
 * @returns Project root when a local install directory exists, otherwise
 *   null.
 */
export function resolveProjectRoot(startDir: string): string | undefined {
    let current = path.resolve(startDir);
    let foundProjectRoot = false;
    const root = path.parse(current).root;

    while (current !== root && !foundProjectRoot) {
        current = path.dirname(current);
        foundProjectRoot = isProjectRoot(current)
    }

    return foundProjectRoot ? current : undefined;
}

/**
 * Returns true if the directory is a project root.
 * 
 * @param dir - The directory to check.
 * @returns True if the directory is a project root, otherwise false.
 */
export function isProjectRoot(dir: string): boolean {
    return existsSync(path.join(dir, SPEC_N_ROLL_DIR));
}

