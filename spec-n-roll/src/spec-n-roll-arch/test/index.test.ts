import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { discoverRuntimePackages } from '../src/index.js';

describe('spec-n-roll-arch', () => {
  it('discovers runtime packages and excludes arch and test packages', () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'spec-n-roll-arch-'));
    const sourceRoot = join(workspaceRoot, 'src');
    mkdirSync(sourceRoot);

    for (const packageName of [
      'spec-n-roll',
      'spec-n-roll-arch',
      'spec-n-roll-test',
    ]) {
      const packageRoot = join(sourceRoot, packageName);
      mkdirSync(packageRoot);
      writeFileSync(
        join(packageRoot, 'package.json'),
        JSON.stringify({ name: packageName, dependencies: {} }),
      );
    }

    expect(
      discoverRuntimePackages(workspaceRoot).map(
        (workspacePackage) => workspacePackage.name,
      ),
    ).toEqual(['spec-n-roll']);
  });
});
