import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import fg from 'fast-glob';
import type { CommandDefinition } from 'agentconfig-api';
import { slugify } from '../utils';

export async function parseCommands(configDir: string): Promise<CommandDefinition[]> {
  const dir = path.join(configDir, 'commands');
  if (!fs.existsSync(dir)) return [];

  const filePaths = await fg('**/*.md', { cwd: dir, absolute: true });
  filePaths.sort();

  return filePaths.map((filePath) => {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(raw);

    const name = path.basename(filePath, '.md');
    const slug =
      typeof data.name === 'string' ? slugify(data.name) : slugify(name);

    return {
      name,
      slug,
      sourcePath: filePath,
      body: content.trim(),
      targets: Array.isArray(data.targets) ? (data.targets as string[]) : undefined,
      excludedTargets: Array.isArray(data.excludedTargets)
        ? (data.excludedTargets as string[])
        : undefined,
    };
  });
}
