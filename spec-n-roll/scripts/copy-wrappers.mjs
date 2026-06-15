import { copyFileSync, cpSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Publish `dist/templates` and `dist/scripts` for the global package. Local-install
// bundle assets are assembled afterward by `scripts/build-local-bundle.mjs`.

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(rootDir, 'scripts', 'wrappers');
const targetDir = path.join(rootDir, 'dist', 'cli');

mkdirSync(targetDir, { recursive: true });

for (const wrapperName of ['spec-n-roll.cmd', 'spec-n-roll-mcp.cmd']) {
  copyFileSync(path.join(sourceDir, wrapperName), path.join(targetDir, wrapperName));
}

cpSync(path.join(rootDir, 'src', 'sdk', 'templates'), path.join(rootDir, 'dist', 'templates'), {
  recursive: true,
});

cpSync(path.join(rootDir, 'src', 'scripts'), path.join(rootDir, 'dist', 'scripts'), {
  recursive: true,
});
