import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DISPATCHER_DIR = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = findToolkitPackageRoot(DISPATCHER_DIR);
const baseEnv = process.env;

/**
 * Locates the toolkit package root by walking upward from a built file location.
 *
 * @param startDir - Directory to begin searching from. Must be inside the toolkit package.
 * @returns Absolute path to the package root containing the Spec-N-Roll package.json.
 */
export function findToolkitPackageRoot(startDir: string): string {
    let current = path.resolve(startDir);
    let foundToolkitRoot = false;
    const root = path.parse(current).root;

    while (current !== root && !foundToolkitRoot) {
        current = path.dirname(current);
        foundToolkitRoot = isToolkitRoot(current);
    }

    if (!foundToolkitRoot) {
        throw new Error(`Unable to locate Spec-N-Roll package root from ${startDir}.`);
    }

    return current;
}

function isToolkitRoot(dir: string): boolean {
    if (!existsSync(path.join(dir, 'package.json'))) {
        return false;
    }

    const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as { name?: string };
    return pkg.name === 'spec-n-roll';
}

export function getGlobalCliNodeRoot(): string {
    return [path.join(packageRoot, 'node_modules'), baseEnv.NODE_PATH]
        .filter(Boolean)
        .join(path.delimiter)
}

export function getDispatcherVersion(): string {
    return readPackageJson(packageRoot).version ?? '0.0.0';
}

export function getDispatcherInstallSource(): string {
    return readLinkedSourcePath(DISPATCHER_DIR) == null ? 'remote' : 'local';
}

export function getDispatcherCliDirectory(): string {
    return DISPATCHER_DIR;
}

export function getDispatcherPackageRoot(): string {
    return findToolkitPackageRoot(DISPATCHER_DIR);
}

export function getDispatcherLinkedSourcePath(): string | null {
    return readLinkedSourcePath(DISPATCHER_DIR);
}

export function getDispatcherEnv(): NodeJS.ProcessEnv {
    const linkedSourcePath = getDispatcherLinkedSourcePath();

    return {
        ...process.env,
        SPEC_N_ROLL_DISPATCHED: '1',
        SPEC_N_ROLL_DISPATCHER_VERSION: getDispatcherVersion(),
        SPEC_N_ROLL_DISPATCHER_INSTALL_SOURCE: getDispatcherInstallSource(),
        SPEC_N_ROLL_DISPATCHER_CLI_DIRECTORY: getDispatcherCliDirectory(),
        SPEC_N_ROLL_DISPATCHER_PACKAGE_ROOT: getDispatcherPackageRoot(),
        ...(linkedSourcePath == null
            ? {}
            : { SPEC_N_ROLL_DISPATCHER_LINKED_SOURCE_PATH: linkedSourcePath }),
    };
}

/**
 * Builds dispatcher metadata for the CLI process being spawned.
 *
 * @returns Environment including dispatcher package and install-source metadata.
 */
// function buildDelegatedEnv(): NodeJS.ProcessEnv {
//     const baseEnv = process.env;
//     const packageRoot = findToolkitPackageRoot(DISPATCHER_DIR);
//     const linkedSourcePath = readLinkedSourcePath(DISPATCHER_DIR);

//     return {
//         ...baseEnv,
//         SPEC_N_ROLL_DISPATCHED: '1',
//         SPEC_N_ROLL_DISPATCHER_VERSION: readPackageJson(packageRoot).version,
//         SPEC_N_ROLL_DISPATCHER_INSTALL_SOURCE: linkedSourcePath == null ? 'remote' : 'local',
//         SPEC_N_ROLL_DISPATCHER_CLI_DIRECTORY: DISPATCHER_DIR,
//         SPEC_N_ROLL_DISPATCHER_PACKAGE_ROOT: packageRoot,
//         ...(linkedSourcePath == null
//             ? {}
//             : { SPEC_N_ROLL_DISPATCHER_LINKED_SOURCE_PATH: linkedSourcePath }),
//         NODE_PATH: [path.join(packageRoot, 'node_modules'), baseEnv.NODE_PATH]
//             .filter(Boolean)
//             .join(path.delimiter),
//     };
// }


/**
 * Reads the linked source package root recorded by the dispatcher marker file.
 *
 * @param dispatcherDir - Directory containing dispatcher build artifacts.
 * @returns Absolute linked source package root, or null when absent or invalid.
 */
function readLinkedSourcePath(dispatcherDir: string): string | null {
    const sourcePath = readText(path.join(dispatcherDir, '.source-package-root'))?.trim();

    return sourcePath != null && readPackageJson(sourcePath).name === 'spec-n-roll'
        ? path.resolve(sourcePath)
        : null;
}

/**
 * Reads package descriptor fields used in dispatcher metadata.
 *
 * @param packageRoot - Absolute package root containing `package.json`.
 * @returns Parsed package descriptor fields, or an empty object when unreadable.
 */
function readPackageJson(packageRoot: string): { name?: unknown; version?: string } {
    try {
        return JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as {
            name?: unknown;
            version?: string;
        };
    } catch {
        return {};
    }
}

/**
 * Reads text from a file without exposing file access errors.
 *
 * @param filePath - Absolute text file path.
 * @returns File text when readable, otherwise undefined.
 */
function readText(filePath: string): string | undefined {
    try {
        return readFileSync(filePath, 'utf8');
    } catch {
        return undefined;
    }
}
