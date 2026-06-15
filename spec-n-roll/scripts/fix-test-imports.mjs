#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const replacements = [
  ["from '../../src/cli/commands/init.js'", "from '../../src/sdk/init.js'"],
  ["from '../../../src/cli/commands/init.js'", "from '../../../src/sdk/init.js'"],
  ["from '../../src/cli/commands/update.js'", "from '../../src/sdk/update.js'"],
  ["from '../../src/cli/commands/remove.js'", "from '../../src/sdk/remove.js'"],
  ["from '../../../src/cli/commands/remove.js'", "from '../../../src/sdk/remove.js'"],
  ["from '../../src/cli/commands/config-agent-add.js'", "from '../../src/sdk/config-agent.js'"],
  ["from '../../src/cli/commands/config-agent-remove.js'", "from '../../src/sdk/config-agent.js'"],
  ["from '../../src/cli/commands/set-list.js'", "from '../../src/sdk/set-list.js'"],
  ["from '../../src/cli/commands/list-agents.js'", "from '../../src/sdk/list-agents.js'"],
  ["from '../../src/cli/commands/version.js'", "from '../../src/sdk/version.js'"],
  ["from '../../../src/cli/commands/version.js'", "from '../../../src/cli/version-invocation.js'"],
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

let changed = 0;
for (const file of [...walk(path.join(rootDir, 'tests')), ...walk(path.join(rootDir, 'src'))]) {
  let content = readFileSync(file, 'utf8');
  const original = content;
  for (const [from, to] of replacements) {
    content = content.replaceAll(from, to);
  }
  if (content !== original) {
    writeFileSync(file, content);
    changed += 1;
  }
}

console.log(`Updated ${changed} consumer import files.`);
