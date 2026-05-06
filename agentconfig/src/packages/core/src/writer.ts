import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { createPatch } from 'diff';
import fg from 'fast-glob';
import type { WriteOptions, DiffEntry } from 'agentconfig-api';

export type { DiffAction, DiffEntry } from 'agentconfig-api';

const contentHashCache = new Map<string, string>();

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function clearHashCache(): void {
  contentHashCache.clear();
}

/**
 * Compare generated files in a temporary directory against the current on-disk state.
 * Returns a DiffEntry for every file.
 */
export async function computeDiff(tempDir: string, outputDir: string): Promise<DiffEntry[]> {
  const files = await fg('**/*', { cwd: tempDir, absolute: false, dot: true });
  const entries: DiffEntry[] = [];

  for (const file of files) {
    const tempPath = path.resolve(tempDir, file);
    const outPath = path.resolve(outputDir, file);

    if (fs.statSync(tempPath).isDirectory()) continue;

    const content = fs.readFileSync(tempPath, 'utf8');

    if (!fs.existsSync(outPath)) {
      entries.push({ path: file, action: 'create', diff: content });
      continue;
    }

    const existing = fs.readFileSync(outPath, 'utf8');
    if (existing === content) {
      entries.push({ path: file, action: 'unchanged' });
      continue;
    }

    entries.push({
      path: file,
      action: 'update',
      diff: createPatch(file, existing, content, 'current', 'generated'),
    });
  }

  return entries;
}

/**
 * Write files from a temporary directory to the final output directory.
 *
 * - Skips files whose content matches the last-written hash (useful in --watch mode).
 * - Respects `overwrite: false` and `dryRun: true` options.
 */
export async function write(tempDir: string, outputDir: string, opts: WriteOptions): Promise<number> {
  const files = await fg('**/*', { cwd: tempDir, absolute: false, dot: true });
  let fileCount = 0;

  for (const file of files) {
    const tempPath = path.resolve(tempDir, file);
    const outPath = path.resolve(outputDir, file);

    if (fs.statSync(tempPath).isDirectory()) continue;
    
    fileCount++;

    if (opts.overwrite === false && fs.existsSync(outPath)) continue;

    const content = fs.readFileSync(tempPath, 'utf8');
    const hash = hashContent(content);
    if (contentHashCache.get(outPath) === hash) continue;

    if (!opts.dryRun) {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, content, 'utf8');
    }

    contentHashCache.set(outPath, hash);
  }

  return fileCount;
}
