import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundleDir = path.join(rootDir, 'dist', 'local-bundle');
const cliEntry = path.join(bundleDir, 'cli', 'index.js');
const mcpEntry = path.join(bundleDir, 'mcp', 'server.js');
const pkg = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

if (!existsSync(cliEntry) || !existsSync(mcpEntry)) {
  throw new Error(
    'Local bundle JS entries are missing. Run `tsup --config tsup.local-bundle.config.ts` before assembling `dist/local-bundle/`.',
  );
}

cpSync(path.join(rootDir, 'src', 'templates'), path.join(bundleDir, 'templates'), {
  recursive: true,
});

cpSync(path.join(rootDir, 'src', 'scripts'), path.join(bundleDir, 'scripts'), {
  recursive: true,
});

writeFileSync(path.join(bundleDir, '.built-package-version'), `${pkg.version}\n`, 'utf8');
