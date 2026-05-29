import * as path from 'node:path';
import * as fs from 'node:fs';
import type { GeneratorPlugin, ValidationResult } from 'agentconfig-api';
import type { SkillDefinition } from '../directive-types';

/**
 * A shared generator for .agents skills.
 * 
 * Many agents use the same .agents/skills directory structure for skills.
 * This plugin handles all of them in one place.
 */
export class SharedSkillGenerator implements GeneratorPlugin<SkillDefinition> {
  readonly agent = [
    'windsurf',
    'windsurf-cli',
    'cursor',
    'copilot',
    'copilot-cli',
    'codex',
    'claude-code',
    'antigravity',
  ];
  readonly instructionType = 'skill';

  validate(_items: SkillDefinition[]): ValidationResult[] {
    return [];
  }

  generate(projectRoot: string, items: SkillDefinition[]): void {
    for (const skill of items) {
      for (const file of skill.files) {
        const dest = path.join(projectRoot, '.agents', 'skills', skill.name, file.relativePath);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, file.content);
      }
    }
  }
}

export default new SharedSkillGenerator();
