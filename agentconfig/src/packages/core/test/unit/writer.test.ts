import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearHashCache, computeDiff, deduplicateOutputs, write } from '../../src/writer';
import type { FileOutput } from '../../src/types/generator';
import { createTempDir, removeDir, writeTree } from '../test-utils';

const tempDirs: string[] = [];

beforeEach(() => {
  clearHashCache();
});

afterEach(() => {
  clearHashCache();
  while (tempDirs.length > 0) {
    removeDir(tempDirs.pop() as string);
  }
});

describe('writer helpers', () => {
  it('deduplicates file outputs by keeping the first path occurrence', () => {
    const files: FileOutput[] = [
      { path: 'one.txt', content: 'first' },
      { path: 'one.txt', content: 'second' },
      { path: 'two.txt', content: 'third' },
    ];

    expect(deduplicateOutputs(files)).toEqual([
      { path: 'one.txt', content: 'first' },
      { path: 'two.txt', content: 'third' },
    ]);
  });

  it('reports create actions for files that do not exist yet', () => {
    const outputDir = createTempDir('agentconfig-diff-create-');
    tempDirs.push(outputDir);

    const diff = computeDiff([{ path: 'create.txt', content: 'new file' }], outputDir);

    expect(diff).toEqual([{ path: 'create.txt', action: 'create', diff: 'new file' }]);
  });

  it('reports unchanged actions when content matches disk', () => {
    const outputDir = createTempDir('agentconfig-diff-unchanged-');
    tempDirs.push(outputDir);

    writeTree(outputDir, {
      'unchanged.txt': 'same',
    });

    const diff = computeDiff([{ path: 'unchanged.txt', content: 'same' }], outputDir);

    expect(diff).toEqual([{ path: 'unchanged.txt', action: 'unchanged' }]);
  });

  it('reports update actions when content differs from disk', () => {
    const outputDir = createTempDir('agentconfig-diff-update-');
    tempDirs.push(outputDir);

    writeTree(outputDir, {
      'update.txt': 'old',
    });

    const diff = computeDiff([{ path: 'update.txt', content: 'new' }], outputDir);

    expect(diff).toEqual([expect.objectContaining({ path: 'update.txt', action: 'update' })]);
  });

  it('skips disk writes in dry-run mode', async () => {
    const outputDir = createTempDir('agentconfig-write-dry-run-');
    tempDirs.push(outputDir);

    await write([{ path: 'dry-run.txt', content: 'preview' }], {
      outputDir,
      dryRun: true,
      overwrite: true,
    });

    expect(fs.existsSync(path.join(outputDir, 'dry-run.txt'))).toBe(false);
  });

  it('does not overwrite existing files when overwrite is false', async () => {
    const outputDir = createTempDir('agentconfig-write-no-overwrite-');
    tempDirs.push(outputDir);

    await write([{ path: 'file.txt', content: 'original' }], {
      outputDir,
      overwrite: true,
    });

    await write([{ path: 'file.txt', content: 'replacement' }], {
      outputDir,
      overwrite: false,
    });

    expect(fs.readFileSync(path.join(outputDir, 'file.txt'), 'utf8')).toBe('original');
  });

  it('skips rewrites when the cached hash already matches the generated content', async () => {
    const outputDir = createTempDir('agentconfig-write-cache-');
    tempDirs.push(outputDir);

    await write([{ path: 'file.txt', content: 'original' }], {
      outputDir,
      overwrite: true,
    });

    fs.writeFileSync(path.join(outputDir, 'file.txt'), 'mutated', 'utf8');
    await write([{ path: 'file.txt', content: 'original' }], {
      outputDir,
      overwrite: true,
    });

    expect(fs.readFileSync(path.join(outputDir, 'file.txt'), 'utf8')).toBe('mutated');
  });

  it('rewrites files after the hash cache is cleared', async () => {
    const outputDir = createTempDir('agentconfig-write-cache-clear-');
    tempDirs.push(outputDir);

    await write([{ path: 'file.txt', content: 'original' }], {
      outputDir,
      overwrite: true,
    });

    fs.writeFileSync(path.join(outputDir, 'file.txt'), 'mutated', 'utf8');
    await write([{ path: 'file.txt', content: 'original' }], {
      outputDir,
      overwrite: true,
    });

    clearHashCache();
    await write([{ path: 'file.txt', content: 'restored' }], {
      outputDir,
      overwrite: true,
    });

    expect(fs.readFileSync(path.join(outputDir, 'file.txt'), 'utf8')).toBe('restored');
  });
});