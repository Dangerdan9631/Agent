import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { createPatch } from 'diff';
import type { FileOutput } from './types/generator';
import type { DiffEntry } from 'agentconfig-api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WriteOptions {
  outputDir: string;
  /** When false, skip files that already exist on disk. Default: true */
  overwrite?: boolean;
  /** When true, do not write any files (dry-run mode). Default: false */
  dryRun?: boolean;
}

// DiffAction and DiffEntry are the canonical api-package types; re-exported
// here so all internal imports from './writer' continue to resolve correctly.
export type { DiffAction, DiffEntry } from 'agentconfig-api';

// ─── Content hash cache (used in --watch mode) ───────────────────────────────

/** Maps absolute file path → sha256 hash of last written content */
const contentHashCache = new Map<string, string>();

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function clearHashCache(): void {
  contentHashCache.clear();
}

// ─── Deduplication ───────────────────────────────────────────────────────────

/**
 * Deduplicate a list of FileOutput entries by path (first-write-wins).
 * This handles the case where multiple generators emit to the same shared path
 * (e.g. `.agents/skills/<name>/` emitted by copilot, cursor, antigravity, etc.).
 */
export function deduplicateOutputs(files: FileOutput[]): FileOutput[] {
  const seen = new Set<string>();
  const deduped: FileOutput[] = [];
  for (const f of files) {
    if (!seen.has(f.path)) {
      seen.add(f.path);
      deduped.push(f);
    }
  }
  return deduped;
}

// ─── Diff ─────────────────────────────────────────────────────────────────────

/**
 * Compare a list of FileOutput entries against the current on-disk state.
 * Returns a DiffEntry for every file.  Input is deduplicated before comparison.
 */
export function computeDiff(files: FileOutput[], outputDir: string): DiffEntry[] {
  return deduplicateOutputs(files).map((file) => {
    const abs = path.resolve(outputDir, file.path);

    if (!fs.existsSync(abs)) {
      return { path: file.path, action: 'create' as const, diff: file.content };
    }

    const existing = fs.readFileSync(abs, 'utf8');
    if (existing === file.content) {
      return { path: file.path, action: 'unchanged' as const };
    }

    return {
      path: file.path,
      action: 'update' as const,
      diff: createPatch(file.path, existing, file.content, 'current', 'generated'),
    };
  });
}

// ─── Writer ───────────────────────────────────────────────────────────────────

/**
 * Write a list of FileOutput entries to disk.
 *
 * - Deduplicates by path (first-write-wins).
 * - Skips files whose content matches the last-written hash (useful in --watch mode).
 * - Respects `overwrite: false` and `dryRun: true` options.
 */
export async function write(files: FileOutput[], opts: WriteOptions): Promise<void> {
  const deduped = deduplicateOutputs(files);

  for (const file of deduped) {
    const abs = path.resolve(opts.outputDir, file.path);

    if (opts.overwrite === false && fs.existsSync(abs)) continue;

    // Content unchanged since last write — skip (avoids spurious "file changed" prompts)
    const hash = hashContent(file.content);
    if (contentHashCache.get(abs) === hash) continue;

    if (!opts.dryRun) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, file.content, 'utf8');
    }

    // Update cache even in dry-run so repeated calls remain consistent
    contentHashCache.set(abs, hash);
  }
}
