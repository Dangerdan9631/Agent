import path from 'node:path';

import fse from 'fs-extra';
import { render } from 'ink-testing-library';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { App } from '../../src/cli/ink/app/App.js';

/**
 * Source fixture copied for each browse integration test.
 */
const FIXTURE_ROOT = path.resolve('tests/fixtures/interactive-multi-spec');

/**
 * Temporary directories created by this test file and removed after each test.
 */
const tempRoots: string[] = [];

/**
 * Creates an isolated project fixture for read-only browse tests.
 *
 * @returns Absolute path to the copied fixture root.
 */
async function copyFixtureProject(): Promise<string> {
  const tempRoot = path.join('node_modules', '.tmp', `interactive-browse-${Date.now()}`);
  await fse.remove(tempRoot);
  await fse.copy(FIXTURE_ROOT, tempRoot);
  const resolved = path.resolve(tempRoot);
  tempRoots.push(resolved);
  return resolved;
}

/**
 * Collects file contents keyed by project-relative path.
 *
 * @param projectRoot - Absolute path to the project fixture.
 * @returns Map of relative file paths to UTF-8 contents.
 */
async function snapshotFiles(projectRoot: string): Promise<Map<string, string>> {
  const snapshot = new Map<string, string>();

  async function visit(directory: string): Promise<void> {
    const entries = await fse.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (entry.isFile()) {
        snapshot.set(
          path.relative(projectRoot, absolutePath),
          await fse.readFile(absolutePath, 'utf8'),
        );
      }
    }
  }

  await visit(projectRoot);
  return snapshot;
}

afterEach(async () => {
  for (const tempRoot of tempRoots.splice(0)) {
    await fse.remove(tempRoot);
  }
});

describe('interactive browse flow', () => {
  it('navigates read-only top-level browse sections without mutating project files', async () => {
    const projectRoot = await copyFixtureProject();
    const before = await snapshotFiles(projectRoot);
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: true,
        binaryContext: 'global',
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 25));
    app.stdin.write('1');
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(app.lastFrame()).toContain('001 active-checkout');
    expect(app.lastFrame()).toContain('Unrecognized');

    app.stdin.write('\r');
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(app.lastFrame()).toContain('Workflow state');
    expect(app.lastFrame()).toContain('current step: implement');

    app.stdin.write('\u001b');
    app.stdin.write('\u001b');
    await new Promise((resolve) => setTimeout(resolve, 25));

    app.stdin.write('2');
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(app.lastFrame()).toContain('Quick');
    expect(app.lastFrame()).toContain('specify > tasks > implement');

    app.stdin.write('\r');
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(app.lastFrame()).toContain('Workflow quick');

    app.stdin.write('\u001b');
    app.stdin.write('\u001b');
    await new Promise((resolve) => setTimeout(resolve, 25));

    app.stdin.write('3');
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(app.lastFrame()).toContain('codex');
    expect(app.lastFrame()).toContain('configured');

    app.stdin.write('\u001b');
    await new Promise((resolve) => setTimeout(resolve, 25));

    app.stdin.write('4');
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(app.lastFrame()).toContain('next task spec id: 3');
    expect(app.lastFrame()).toContain('current task: 001-active-checkout');

    app.unmount();
    expect(await snapshotFiles(projectRoot)).toEqual(before);
  });
});
