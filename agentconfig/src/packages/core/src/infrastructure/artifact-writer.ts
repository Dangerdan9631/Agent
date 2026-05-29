import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createPatch } from 'diff';
import fg from 'fast-glob';
import type { DiffEntry, WriteOptions } from 'agentconfig-api';
import type { IArtifactWriter } from '../application/ports';

const contentHashCache = new Map<string, string>();

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function clearHashCache(): void {
  contentHashCache.clear();
}

export class ArtifactWriter implements IArtifactWriter {
  async computeDiff(tempDir: string, outputDir: string): Promise<DiffEntry[]> {
    const files = await fg('**/*', { cwd: tempDir, absolute: false, dot: true });
    const entries: DiffEntry[] = [];

    for (const file of files) {
      const tempPath = path.resolve(tempDir, file);
      if (fs.statSync(tempPath).isDirectory()) {
        continue;
      }

      const outputPath = path.resolve(outputDir, file);
      const content = fs.readFileSync(tempPath, 'utf8');
      if (!fs.existsSync(outputPath)) {
        entries.push({ path: file, action: 'create', diff: content });
        continue;
      }

      const existing = fs.readFileSync(outputPath, 'utf8');
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

  async write(tempDir: string, outputDir: string, opts: WriteOptions): Promise<number> {
    const files = await fg('**/*', { cwd: tempDir, absolute: false, dot: true });
    let fileCount = 0;

    for (const file of files) {
      const tempPath = path.resolve(tempDir, file);
      if (fs.statSync(tempPath).isDirectory()) {
        continue;
      }

      fileCount += 1;
      const outputPath = path.resolve(outputDir, file);
      if (opts.overwrite === false && fs.existsSync(outputPath)) {
        continue;
      }

      const content = fs.readFileSync(tempPath, 'utf8');
      const hash = hashContent(content);
      if (contentHashCache.get(outputPath) === hash) {
        continue;
      }

      if (!opts.dryRun) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, content, 'utf8');
      }

      contentHashCache.set(outputPath, hash);
    }

    return fileCount;
  }
}