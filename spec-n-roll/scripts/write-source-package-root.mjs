import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetDir = path.join(rootDir, 'dist', 'cli');
const markerPath = path.join(targetDir, '.source-package-root');
const builtVersionPath = path.join(targetDir, '.built-package-version');
const pkg = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

mkdirSync(targetDir, { recursive: true });
writeFileSync(markerPath, `${rootDir}\n`, 'utf8');
writeFileSync(builtVersionPath, `${pkg.version}\n`, 'utf8');
