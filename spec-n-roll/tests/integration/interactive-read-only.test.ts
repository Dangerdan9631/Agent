import path from 'node:path';

import fse from 'fs-extra';
import { render } from 'ink-testing-library';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { App } from '../../src/cli/ink/app/App.js';

/**
 * Source fixture copied for each read-only integration test.
 */
const FIXTURE_ROOT = path.resolve('tests/fixtures/interactive-multi-spec');

/**
 * Temporary project roots created by this test file.
 */
const tempRoots: string[] = [];

/**
 * Escape sequence for the terminal down-arrow key.
 */
const DOWN_ARROW = '\u001B[B';

/**
 * Creates an isolated copy of the interactive fixture project.
 *
 * @returns Absolute path to the copied project root.
 */
async function copyFixtureProject(): Promise<string> {
  const tempRoot = path.join('node_modules', '.tmp', `interactive-read-only-${Date.now()}`);
  await fse.remove(tempRoot);
  await fse.copy(FIXTURE_ROOT, tempRoot);
  const resolved = path.resolve(tempRoot);
  tempRoots.push(resolved);
  return resolved;
}

/**
 * Captures every fixture file path and its UTF-8 contents.
 *
 * @param projectRoot - Absolute project root to snapshot.
 * @returns Map keyed by relative file path with file contents as values.
 */
async function snapshotProjectFiles(projectRoot: string): Promise<Map<string, string>> {
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

/**
 * Waits briefly for Ink state updates and asynchronous read models to settle.
 *
 * @returns Promise that resolves after the UI has had one update window.
 */
async function waitForFrame(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

/**
 * Sets the process stdout row count for Ink test renders.
 *
 * @param rows - Positive terminal row count to expose during the test.
 * @returns Cleanup callback that restores the previous descriptor.
 */
function setTerminalRows(rows: number): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(process.stdout, 'rows');
  Object.defineProperty(process.stdout, 'rows', {
    configurable: true,
    value: rows,
  });

  return () => {
    if (descriptor == null) {
      Reflect.deleteProperty(process.stdout, 'rows');
      return;
    }

    Object.defineProperty(process.stdout, 'rows', descriptor);
  };
}

afterEach(async () => {
  for (const tempRoot of tempRoots.splice(0)) {
    await fse.remove(tempRoot);
  }
});

describe('interactive read-only navigation', () => {
  it('does not mutate files while exploring read-only routes', async () => {
    const projectRoot = await copyFixtureProject();
    const before = await snapshotProjectFiles(projectRoot);
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: true,
        binaryContext: 'global',
      }),
    );

    await waitForFrame();
    app.stdin.write('1');
    await waitForFrame();
    app.stdin.write('\r');
    await waitForFrame();
    app.stdin.write('\u001b');
    app.stdin.write('\u001b');
    await waitForFrame();

    app.stdin.write('2');
    await waitForFrame();
    app.stdin.write('\r');
    await waitForFrame();
    app.stdin.write('\u001b');
    app.stdin.write('\u001b');
    await waitForFrame();

    app.stdin.write('3');
    await waitForFrame();
    app.stdin.write('t');
    await waitForFrame();
    app.stdin.write('\u001b');

    app.stdin.write('4');
    await waitForFrame();
    app.stdin.write('\u001b');

    expect(await snapshotProjectFiles(projectRoot)).toEqual(before);
    app.unmount();
  });

  it('does not mutate files when moving focus in a constrained terminal', async () => {
    const restoreRows = setTerminalRows(12);
    const projectRoot = await copyFixtureProject();
    const before = await snapshotProjectFiles(projectRoot);
    const app = render(
      React.createElement(App, {
        projectRoot,
        isInitialized: true,
        binaryContext: 'global',
      }),
    );

    await waitForFrame();
    app.stdin.write(DOWN_ARROW);
    await waitForFrame();
    app.stdin.write(DOWN_ARROW);
    await waitForFrame();

    const frame = app.lastFrame() ?? '';
    expect(frame).toContain('Agents');
    expect(frame).toContain('> 3 Agents');
    expect(frame).not.toContain('Shows configured, available, and missing');
    expect(await snapshotProjectFiles(projectRoot)).toEqual(before);

    app.unmount();
    restoreRows();
  });
});
