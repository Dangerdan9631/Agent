import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type {
  AgentConfig,
  DirectiveTypePlugin,
  ValidationResult,
  WriteOptions,
} from 'agentconfig-api';
import type { InstructionType } from 'agentconfig-api';
import { parseInstructions } from '../directive-parsers/instruction';

export type ActivationType = 'always' | 'scoped' | 'ai-decided' | 'manual';

export class InstructionFile implements InstructionType {
  readonly typeId = 'instruction';

  constructor(
    public name: string,
    public sourcePath: string,
    public activation: ActivationType,
    public body: string,
    public slug: string,
    public globs?: string[],
    public description?: string,
    public targets?: string[],
    public excludedTargets?: string[],
    public importNote?: string,
  ) {}

  validate(): ValidationResult[] {
    const results: ValidationResult[] = [];
    if (!this.name) results.push({ level: 'error', message: 'name is required' });
    if (!this.body) results.push({ level: 'warning', message: 'body is empty' });
    if (this.activation === 'scoped' && (!this.globs || this.globs.length === 0)) {
      results.push({ level: 'error', message: '"globs" is required when activation is "scoped".' });
    }
    if (this.activation === 'ai-decided' && !this.description) {
      results.push({ level: 'error', message: '"description" is required when activation is "ai-decided".' });
    }
    return results;
  }
}

function writeFile(filePath: string, content: string, opts?: WriteOptions): void {
  if (opts?.overwrite === false && fs.existsSync(filePath)) return;
  if (opts?.dryRun) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function getEffectiveTargets(config: AgentConfig, item: InstructionFile): string[] {
  return config.targets.filter((target) => {
    if (item.targets && item.targets.length > 0 && !item.targets.includes(target)) return false;
    if (item.excludedTargets?.includes(target)) return false;
    return true;
  });
}

export const instructionDirectiveTypePlugin: DirectiveTypePlugin<InstructionFile> = {
  typeId: 'instruction',
  displayName: 'Instructions',
  parse(configDir: string): Promise<InstructionFile[]> {
    return parseInstructions(configDir);
  },
  write(items: InstructionFile[], configDir: string, opts?: WriteOptions): void {
    for (const inst of items) {
      const fields: Record<string, unknown> = { activation: inst.activation };
      if (inst.globs?.length) fields.globs = inst.globs;
      if (inst.description) fields.description = inst.description;
      if (inst.slug !== inst.name) fields.name = inst.slug;
      if (inst.targets?.length) fields.targets = inst.targets;
      if (inst.excludedTargets?.length) fields.excludedTargets = inst.excludedTargets;

      let frontmatter = `---\n${yaml.dump(fields).trimEnd()}\n---`;
      if (inst.importNote) {
        frontmatter = `${inst.importNote}\n${frontmatter}`;
      }

      writeFile(
        path.join(configDir, 'instructions', `${inst.name}.md`),
        `${frontmatter}\n\n${inst.body}\n`,
        opts,
      );
    }
  },
  validate(items: InstructionFile[], config: AgentConfig): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (const inst of items) {
      const effectiveTargets = getEffectiveTargets(config, inst);
      const bodyLength = inst.body.length;

      if (effectiveTargets.includes('antigravity') && bodyLength > 12_000) {
        results.push({
          level: 'warning',
          message: `Antigravity rule file exceeds 12,000 character limit (${bodyLength} chars).`,
          file: inst.sourcePath,
        });
      }

      if (effectiveTargets.includes('windsurf') && bodyLength > 12_000) {
        results.push({
          level: 'warning',
          message: `Windsurf rule file exceeds 12,000 character limit (${bodyLength} chars).`,
          file: inst.sourcePath,
        });
      }

      if (effectiveTargets.includes('cursor')) {
        if (inst.activation === 'always' && bodyLength > 6_000) {
          results.push({
            level: 'warning',
            message: `Cursor always-on rule exceeds the 6,000-character global limit (${bodyLength} chars). Consider splitting or using activation: scoped.`,
            file: inst.sourcePath,
          });
        } else if (bodyLength > 12_000) {
          results.push({
            level: 'warning',
            message: `Cursor rule file exceeds 12,000 character limit (${bodyLength} chars).`,
            file: inst.sourcePath,
          });
        }
      }
    }

    if (config.targets.includes('claude-code') && config.targets.includes('codex')) {
      results.push({
        level: 'warning',
        message:
          'Both claude-code and codex targets are active. If "CLAUDE.md" is listed in Codex\'s project_doc_fallback_filenames, Claude Code\'s always-on instructions may be double-loaded by Codex.',
      });
    }

    return results;
  },
};
