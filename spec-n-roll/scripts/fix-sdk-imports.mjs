import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MODULES = [
  'config',
  'core',
  'workflow',
  'repository',
  'setlists',
  'specs',
  'agents',
  'manifesto',
  'updates',
  'extensions',
  'living-specs',
  'templates',
  'install',
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      walk(full, files);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function fixContent(filePath, content) {
  const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
  const inSdk = rel.startsWith('src/sdk/');

  let next = content;

  if (inSdk && rel.startsWith('src/sdk/install/')) {
    next = next.replaceAll('../../core/', '../core/');
  }

  if (!inSdk) {
    for (const mod of MODULES) {
      const pattern = new RegExp(
        `(from ['"])((?:\\.\\./)+)(${mod.replace('-', '\\-')}/)`,
        'g',
      );
      next = next.replace(pattern, (match, prefix, dots, modPath) => {
        if (match.includes('/sdk/')) return match;
        return `${prefix}${dots}sdk/${modPath}`;
      });
    }

    next = next.replaceAll("from '../local-install/", "from '../sdk/install/");
    next = next.replaceAll("from '../../local-install/", "from '../../sdk/install/");
    next = next.replaceAll("from '../../../local-install/", "from '../../../sdk/install/");
    next = next.replaceAll("from '../../../../local-install/", "from '../../../../sdk/install/");
    next = next.replaceAll("from './local-install/", "from '../sdk/install/");
  }

  if (rel.startsWith('tests/')) {
    for (const mod of MODULES.filter((m) => m !== 'install')) {
      next = next.replaceAll(`src/${mod}/`, `src/sdk/${mod}/`);
    }
  }

  return next;
}

const targets = [
  ...walk(path.join(rootDir, 'src')),
  ...walk(path.join(rootDir, 'tests')),
];

let changed = 0;
for (const file of targets) {
  const original = readFileSync(file, 'utf8');
  const updated = fixContent(file, original);
  if (updated !== original) {
    writeFileSync(file, updated);
    changed += 1;
  }
}

console.log(`Updated ${changed} files.`);
