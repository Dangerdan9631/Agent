import { copyFileSync, cpSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(rootDir, 'scripts', 'wrappers');
const targetDir = path.join(rootDir, 'dist', 'cli');

mkdirSync(targetDir, { recursive: true });

for (const wrapperName of ['spec-n-roll.cmd', 'spec-n-roll-mcp.cmd']) {
  copyFileSync(path.join(sourceDir, wrapperName), path.join(targetDir, wrapperName));
}

cpSync(path.join(rootDir, 'src', 'templates'), path.join(rootDir, 'dist', 'templates'), {
  recursive: true,
});
