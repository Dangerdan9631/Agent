import * as fs from 'node:fs';
import * as path from 'node:path';
import { safeMatter as matter } from '../utils';
import fg from 'fast-glob';
import type { InstructionFile, ActivationType } from 'agentconfig-api';
import type { DetectedAgent } from 'agentconfig-api';

/** Detect whether an Antigravity configuration is present in `dir`. */
export function detectAntigravity(dir: string): DetectedAgent[] {
  if (fs.existsSync(path.join(dir, '.agents', 'rules'))) {
    return [{ name: 'antigravity', confidence: 'high' }];
  }
  return [];
}

const ACTIVATION_MAP: Record<string, ActivationType> = {
  always: 'always',
  glob: 'scoped',
  model: 'ai-decided',
  manual: 'manual',
};

/**
 * Import instructions from an Antigravity project.
 * Reads .agents/rules/*.md and maps activation: frontmatter directly to IR.
 */
export async function importAntigravity(
  sourceDir: string,
): Promise<{ instructions: InstructionFile[] }> {
  const instructions: InstructionFile[] = [];
  const rulesDir = path.join(sourceDir, '.agents', 'rules');
  if (!fs.existsSync(rulesDir)) return { instructions };

  const files = await fg('**/*.md', { cwd: rulesDir, absolute: true });

  for (const filePath of files.sort()) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content, parseWarning } = matter(raw);
    const stem = path.basename(filePath, '.md');
    const body = content.trim();

    const rawActivation = typeof data.activation === 'string' ? data.activation : 'always';
    const activation: ActivationType = ACTIVATION_MAP[rawActivation] ?? 'always';

    const inst: InstructionFile = {
      name: stem,
      sourcePath: filePath,
      activation,
      slug: stem,
      body,
    };

    if (activation === 'scoped') {
      const glob = typeof data.glob === 'string' ? data.glob : '**/*';
      inst.globs = [glob];
    } else if (activation === 'ai-decided') {
      inst.description =
        typeof data.description === 'string' ? data.description : undefined;
      if (!inst.description) {
        inst.importNote =
          '# TODO: verify activation — ai-decided inferred from activation: model but no description found';
      }
    }

    if (parseWarning && !inst.importNote) inst.importNote = parseWarning;

    instructions.push(inst);
  }

  return { instructions };
}
