import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearHashCache, computeDiff, write } from '../../src/writer';
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
  it('reports create actions for files that do not exist yet', async () => {
    const tempDir = createTempDir('agentconfig-diff-temp-');
    const outputDir = createTempDir('agentconfig-diff-create-');
    tempDirs.push(tempDir, outputDir);
    writeTree(tempDir, { 'create.txt': 'new file' });

    const diff = await computeDiff(tempDir, outputDir);

    expect(diff).toEqual([{ path: 'create.txt', action: 'create', diff: 'new file' }]);
  });

  it('reports unchanged actions when content matches disk', async () => {
    const tempDir = createTempDir('agentconfig-diff-temp-');
    const outputDir = createTempDir('agentconfig-diff-unchanged-');
    tempDirs.push(tempDir, outputDir);
    writeTree(tempDir, { 'unchanged.txt': 'same' });
    writeTree(outputDir, { 'unchanged.txt': 'same' });

    const diff = await computeDiff(tempDir, outputDir);

    expect(diff).toEqual([{ path: 'unchanged.txt', action: 'unchanged' }]);
  });

  it('reports update actions when content differs from disk', async () => {
    const tempDir = createTempDir('agentconfig-diff-temp-');
    const outputDir = createTempDir('agentconfig-diff-update-');
    tempDirs.push(tempDir, outputDir);
    writeTree(tempDir, { 'update.txt': 'new' });
    writeTree(outputDir, { 'update.txt': 'old' });

    const diff = await computeDiff(tempDir, outputDir);

    expect(diff).toEqual([expect.objectContaining({ path: 'update.txt', action: 'update' })]);
  });

  it('skips disk writes in dry-run mode', async () => {
    const tempDir = createTempDir('agentconfig-write-temp-');
    const outputDir = createTempDir('agentconfig-write-dry-run-');
    tempDirs.push(tempDir, outputDir);
    writeTree(tempDir, { 'dry-run.txt': 'preview' });

    await write(tempDir, outputDir, {
      dryRun: true,
      overwrite: true,
    });

    expect(fs.existsSync(path.join(outputDir, 'dry-run.txt'))).toBe(false);
  });

  it('does not overwrite existing files when overwrite is false', async () => {
    const tempDir = createTempDir('agentconfig-write-temp-');
    const outputDir = createTempDir('agentconfig-write-no-overwrite-');
    tempDirs.push(tempDir, outputDir);
    writeTree(tempDir, { 'file.txt': 'replacement' });
    writeTree(outputDir, { 'file.txt': 'original' });

    await write(tempDir, outputDir, {
      overwrite: false,
    });

    expect(fs.readFileSync(path.join(outputDir, 'file.txt'), 'utf8')).toBe('original');
  });

  it('skips rewrites when the cached hash already matches the generated content', async () => {
    const tempDir = createTempDir('agentconfig-write-temp-');
    const outputDir = createTempDir('agentconfig-write-cache-');
    tempDirs.push(tempDir, outputDir);
    writeTree(tempDir, { 'file.txt': 'original' });

    await write(tempDir, outputDir, {
      overwrite: true,
    });

    fs.writeFileSync(path.join(outputDir, 'file.txt'), 'mutated', 'utf8');
    await write(tempDir, outputDir, {
      overwrite: true,
    });

    expect(fs.readFileSync(path.join(outputDir, 'file.txt'), 'utf8')).toBe('mutated');
  });

  it('rewrites files after the hash cache is cleared', async () => {
    const tempDir = createTempDir('agentconfig-write-temp-');
    const outputDir = createTempDir('agentconfig-write-cache-clear-');
    tempDirs.push(tempDir, outputDir);
    writeTree(tempDir, { 'file.txt': 'original' });

    await write(tempDir, outputDir, {
      overwrite: true,
    });

    fs.writeFileSync(path.join(outputDir, 'file.txt'), 'mutated', 'utf8');
    
    // Simulate re-generating the content
    writeTree(tempDir, { 'file.txt': 'restored' });

    clearHashCache();
    await write(tempDir, outputDir, {
      overwrite: true,
    });

    expect(fs.readFileSync(path.join(outputDir, 'file.txt'), 'utf8')).toBe('restored');
  });
});