import * as fs from 'node:fs';
import * as path from 'node:path';
import { safeMatter as matter } from '../utils';
import fg from 'fast-glob';
import type { InstructionFile, ActivationType } from '../types/ir';
import type { DetectedAgent } from '../types/generator';

/** Detect whether a Windsurf configuration is present in `dir`. */
export function detectWindsurf(dir: string): DetectedAgent[] {
  if (fs.existsSync(path.join(dir, '.windsurf', 'rules'))) {
    return [{ name: 'windsurf', confidence: 'high' }];
  }
  return [];
}

const TRIGGER_MAP: Record<string, ActivationType> = {
  always_on: 'always',
  glob: 'scoped',
  model_decision: 'ai-decided',
  manual: 'manual',
};

/**
 * Import instructions from a Windsurf project.
 * Reads .windsurf/rules/*.md and maps trigger: frontmatter to IR activation.
 */
export async function importWindsurf(
  sourceDir: string,
): Promise<{ instructions: InstructionFile[] }> {
  const instructions: InstructionFile[] = [];
  const rulesDir = path.join(sourceDir, '.windsurf', 'rules');
  if (!fs.existsSync(rulesDir)) return { instructions };

  const files = await fg('**/*.md', { cwd: rulesDir, absolute: true });

  for (const filePath of files.sort()) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content, parseWarning } = matter(raw);
    const stem = path.basename(filePath, '.md');
    const body = content.trim();

    const trigger = typeof data.trigger === 'string' ? data.trigger : 'always_on';
    const activation: ActivationType = TRIGGER_MAP[trigger] ?? 'always';

    const inst: InstructionFile = {
      name: stem,
      sourcePath: filePath,
      activation,
      slug: stem,
      body,
    };

    if (activation === 'scoped') {
      const rawGlobs = typeof data.globs === 'string' ? data.globs : '';
      inst.globs = rawGlobs
        .split(',')
        .map((g: string) => g.trim())
        .filter(Boolean);
    } else if (activation === 'ai-decided') {
      inst.description =
        typeof data.description === 'string' ? data.description : undefined;
    }

    if (!TRIGGER_MAP[trigger]) {
      inst.importNote =
        `# TODO: verify activation — unknown Windsurf trigger "${trigger}"`;
    }

    if (parseWarning && !inst.importNote) inst.importNote = parseWarning;

    instructions.push(inst);
  }

  return { instructions };
}
