import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Absolute root directory for the dispatcher package.
 */
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Absolute path to the dispatcher build output directory.
 */
const distRoot = join(packageRoot, 'dist');

mkdirSync(distRoot, { recursive: true });
writeFileSync(
  join(distRoot, '.source-package-root'),
  `${packageRoot}\n`,
  'utf8',
);
