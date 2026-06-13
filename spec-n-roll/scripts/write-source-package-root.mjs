import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetDir = path.join(rootDir, 'dist', 'cli');
const markerPath = path.join(targetDir, '.source-package-root');

mkdirSync(targetDir, { recursive: true });
writeFileSync(markerPath, `${rootDir}\n`, 'utf8');
