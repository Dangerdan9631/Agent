import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import fg from 'fast-glob';
import { InstructionFile, type ActivationType } from '../directive-types/instruction';

const VALID_ACTIVATIONS = new Set<ActivationType>(['always', 'scoped', 'ai-decided', 'manual']);

export async function parseInstructions(configDir: string): Promise<InstructionFile[]> {
  const dir = path.join(configDir, 'instructions');
  if (!fs.existsSync(dir)) return [];

  const filePaths = await fg('**/*.md', { cwd: dir, absolute: true });
  filePaths.sort();

  return filePaths.map((filePath) => {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(raw);

    const name = path.basename(filePath, '.md');
    const activation: ActivationType = VALID_ACTIVATIONS.has(data.activation)
      ? (data.activation as ActivationType)
      : 'always';

    return new InstructionFile(
      name,
      filePath,
      activation,
      content.trim(),
      typeof data.name === 'string' ? data.name : name,
      Array.isArray(data.globs) ? (data.globs as string[]) : undefined,
      typeof data.description === 'string' ? data.description : undefined,
      Array.isArray(data.targets) ? (data.targets as string[]) : undefined,
      Array.isArray(data.excludedTargets) ? (data.excludedTargets as string[]) : undefined
    );
  });
}
