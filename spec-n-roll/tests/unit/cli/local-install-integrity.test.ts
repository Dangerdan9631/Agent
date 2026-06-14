import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  isLegacyLocalInstall,
  LOCAL_INSTALL_LAYOUT_VERSION,
  shouldBypassLocalInstallIntegrity,
  validateLocalInstall,
} from '../../../src/cli/local-install-integrity.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary CLI root directory tracked for cleanup after each test.
 *
 * @param suffix - Unique suffix for the directory name.
 * @returns Absolute path to the created CLI root.
 */
function createCliRoot(suffix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-integrity-${suffix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

/**
 * Writes a complete layout v1 install tree under the given CLI root.
 *
 * @param cliRoot - Absolute path to `.spec-n-roll/cli`.
 * @param options - Optional manifest overrides.
 */
function writeValidLayoutV1Install(
  cliRoot: string,
  options?: { layoutVersion?: number; packageName?: string },
): void {
  mkdirSync(path.join(cliRoot, 'bin'), { recursive: true });
  mkdirSync(path.join(cliRoot, 'dist', 'cli'), { recursive: true });
  mkdirSync(path.join(cliRoot, 'dist', 'mcp'), { recursive: true });

  writeFileSync(path.join(cliRoot, 'dist', 'cli', 'index.js'), 'export {};\n', 'utf8');
  writeFileSync(path.join(cliRoot, 'dist', 'mcp', 'server.js'), 'export {};\n', 'utf8');
  writeFileSync(path.join(cliRoot, 'bin', 'spec-n-roll'), buildInTreeLauncherSource(), 'utf8');
  writeFileSync(
    path.join(cliRoot, 'package.json'),
    JSON.stringify({
      name: options?.packageName ?? 'spec-n-roll',
      version: '1.0.0',
    }),
    'utf8',
  );
  writeFileSync(
    path.join(cliRoot, 'install.json'),
    JSON.stringify({
      toolkitVersion: '1.0.0',
      layoutVersion: options?.layoutVersion ?? LOCAL_INSTALL_LAYOUT_VERSION,
      installedAt: '2026-06-13T00:00:00.000Z',
    }),
    'utf8',
  );
}

/**
 * Builds a minimal in-tree launcher source for integrity fixture setup.
 *
 * @returns UTF-8 launcher body referencing the bundled CLI entry.
 */
function buildInTreeLauncherSource(): string {
  return `#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const bundleEntry = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cli', 'index.js');
console.log(bundleEntry);
`;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir != null) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup.
      }
    }
  }
});

describe('isLegacyLocalInstall', () => {
  it('detects toolkitPackageRoot in install.json', () => {
    const cliRoot = createCliRoot('legacy-manifest');
    writeFileSync(
      path.join(cliRoot, 'install.json'),
      JSON.stringify({
        toolkitPackageRoot: '/global/spec-n-roll',
        toolkitVersion: '1.0.0',
      }),
      'utf8',
    );

    expect(isLegacyLocalInstall(cliRoot)).toBe(true);
  });

  it('detects toolkitPackageRoot references in launcher source', () => {
    const cliRoot = createCliRoot('legacy-launcher');
    mkdirSync(path.join(cliRoot, 'bin'), { recursive: true });
    writeFileSync(
      path.join(cliRoot, 'bin', 'spec-n-roll'),
      'const entry = manifest.toolkitPackageRoot;\n',
      'utf8',
    );

    expect(isLegacyLocalInstall(cliRoot)).toBe(true);
  });

  it('returns false for layout v1 installs', () => {
    const cliRoot = createCliRoot('layout-v1');
    writeValidLayoutV1Install(cliRoot);

    expect(isLegacyLocalInstall(cliRoot)).toBe(false);
  });
});

describe('validateLocalInstall', () => {
  it('returns valid for a complete layout v1 install', () => {
    const cliRoot = createCliRoot('valid');
    writeValidLayoutV1Install(cliRoot);

    const result = validateLocalInstall(cliRoot);

    expect(result).toEqual({
      status: 'valid',
      missingPaths: [],
      layoutVersion: LOCAL_INSTALL_LAYOUT_VERSION,
    });
  });

  it('returns legacy-layout when install.json references toolkitPackageRoot', () => {
    const cliRoot = createCliRoot('legacy');
    writeValidLayoutV1Install(cliRoot);
    writeFileSync(
      path.join(cliRoot, 'install.json'),
      JSON.stringify({
        toolkitPackageRoot: '/global/spec-n-roll',
        toolkitVersion: '1.0.0',
        layoutVersion: 1,
        installedAt: '2026-06-13T00:00:00.000Z',
      }),
      'utf8',
    );

    const result = validateLocalInstall(cliRoot);

    expect(result.status).toBe('invalid');
    expect(result.reason).toBe('legacy-layout');
    expect(result.message).toMatch(/deprecated layout/i);
  });

  it('reports missing bundle paths', () => {
    const cliRoot = createCliRoot('missing-bundle');
    writeValidLayoutV1Install(cliRoot);
    rmSync(path.join(cliRoot, 'dist', 'cli', 'index.js'));

    const result = validateLocalInstall(cliRoot);

    expect(result.status).toBe('invalid');
    expect(result.reason).toBe('missing-paths');
    expect(result.missingPaths).toContain('dist/cli/index.js');
    expect(result.message).toMatch(/incomplete/i);
  });

  it('rejects unknown layout versions', () => {
    const cliRoot = createCliRoot('unknown-layout');
    writeValidLayoutV1Install(cliRoot, { layoutVersion: 99 });

    const result = validateLocalInstall(cliRoot);

    expect(result.status).toBe('invalid');
    expect(result.reason).toBe('unknown-layout-version');
    expect(result.layoutVersion).toBe(99);
  });

  it('rejects package descriptors that are not spec-n-roll', () => {
    const cliRoot = createCliRoot('bad-package');
    writeValidLayoutV1Install(cliRoot, { packageName: 'other-package' });

    const result = validateLocalInstall(cliRoot);

    expect(result.status).toBe('invalid');
    expect(result.reason).toBe('invalid-package-name');
  });
});

describe('shouldBypassLocalInstallIntegrity', () => {
  it('allows repair commands and bare interactive invocation', () => {
    expect(shouldBypassLocalInstallIntegrity([])).toBe(true);
    expect(shouldBypassLocalInstallIntegrity(['update'])).toBe(true);
    expect(shouldBypassLocalInstallIntegrity(['update', '--dry-run'])).toBe(true);
    expect(shouldBypassLocalInstallIntegrity(['init'])).toBe(true);
    expect(shouldBypassLocalInstallIntegrity(['remove', '--yes'])).toBe(true);
  });

  it('blocks integrity bypass for normal commands and version flags', () => {
    expect(shouldBypassLocalInstallIntegrity(['version'])).toBe(false);
    expect(shouldBypassLocalInstallIntegrity(['-v'])).toBe(false);
    expect(shouldBypassLocalInstallIntegrity(['--version'])).toBe(false);
    expect(shouldBypassLocalInstallIntegrity(['roll'])).toBe(false);
  });
});
