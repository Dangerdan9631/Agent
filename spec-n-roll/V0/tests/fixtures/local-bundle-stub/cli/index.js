#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Locates the nearest spec-n-roll package.json walking upward from a directory.
 *
 * @param startDir - Directory to begin searching from.
 * @returns Absolute path to the package root containing spec-n-roll package.json.
 */
function findToolkitPackageRoot(startDir) {
  let current = path.resolve(startDir);

  while (true) {
    const packageJsonPath = path.join(current, 'package.json');

    if (existsSync(packageJsonPath)) {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      if (pkg.name === 'spec-n-roll') {
        return current;
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Unable to locate Spec-N-Roll package root from ${startDir}.`);
    }
    current = parent;
  }
}

/**
 * Reads the toolkit semver from the resolved package root.
 *
 * @returns Semver string from package.json.
 */
function readToolkitPackageVersion() {
  const packageRoot = findToolkitPackageRoot(path.dirname(fileURLToPath(import.meta.url)));
  const pkg = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  return pkg.version;
}

/**
 * Locates the nearest project-local CLI launcher walking upward from cwd.
 *
 * @param cwd - Working directory to begin the search from.
 * @returns Absolute launcher path when found.
 */
function findLocalCliPath(cwd) {
  let current = path.resolve(cwd);

  while (true) {
    const cliPath = path.join(current, '.spec-n-roll', 'cli', 'bin', 'spec-n-roll');
    if (existsSync(cliPath)) {
      return cliPath;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}

/**
 * Prints a minimal version report compatible with integration assertions.
 */
function printVersionReport() {
  const toolkitVersion = readToolkitPackageVersion();
  const invocation = process.env.SPEC_N_ROLL_LOCAL_PIN === '1' ? 'local' : 'global';
  const lines = [`toolkit version: ${toolkitVersion}`, `invocation: ${invocation}`];

  if (process.env.SPEC_N_ROLL_DISPATCHED === '1' && process.env.SPEC_N_ROLL_DISPATCHER_VERSION != null) {
    lines.push(`dispatcher version: ${process.env.SPEC_N_ROLL_DISPATCHER_VERSION}`);
  }

  if (invocation === 'local') {
    const localCliPath = findLocalCliPath(process.cwd());
    if (localCliPath != null) {
      lines.push(`local CLI path: ${localCliPath}`);
    }
  }

  process.stdout.write(`${lines.join('\n')}\n`);
}

const argv = process.argv.slice(2);

if (argv[0] === 'version' || argv.includes('-v') || argv.includes('--version')) {
  printVersionReport();
  process.exit(0);
}

if (argv[0] === 'init' && argv.includes('--help')) {
  process.stdout.write('Initialize Spec-N-Roll in a project\n');
  process.exit(0);
}

console.error(`Unsupported stub command: ${argv.join(' ')}`);
process.exit(1);
