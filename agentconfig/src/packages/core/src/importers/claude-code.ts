import * as fs from 'node:fs';
import * as path from 'node:path';
import { safeMatter as matter } from '../utils';
import fg from 'fast-glob';
import type { ImporterPlugin, ValidationResult, DetectedAgent } from 'agentconfig-api';
import { InstructionFile, AgentDefinition } from '../types';

export function detectClaudeCode(dir: string): DetectedAgent[] {
  if (fs.existsSync(path.join(dir, '.claude'))) {
    return [{ name: 'claude-code', confidence: 'high' }];
  }
  if (fs.existsSync(path.join(dir, 'CLAUDE.md'))) {
    return [{ name: 'claude-code', confidence: 'low' }];
  }
  return [];
}

const IN_TEXT_PREFIX = '> **Apply only when:**';

function isAiDecidedBody(body: string): boolean {
  return body.trimStart().startsWith(IN_TEXT_PREFIX);
}

function extractDescription(body: string): string {
  return (body.trimStart().split('\n')[0] ?? '')
    .replace(/^>\s*\*\*Apply only when:\*\*\s*/, '')
    .trim();
}

function stripInTextCondition(body: string): string {
  return body
    .trimStart()
    .split('\n')
    .slice(2)
    .join('\n')
    .trimStart();
}

export class ClaudeCodeInstructionImporter implements ImporterPlugin<InstructionFile> {
  readonly agent = 'claude-code';
  readonly instructionType = 'instruction';

  validate(_projectRoot: string): ValidationResult[] {
    return [];
  }

  async import(projectRoot: string): Promise<InstructionFile[]> {
    const instructions: InstructionFile[] = [];

    // Always: .claude/CLAUDE.md (or root CLAUDE.md)
    for (const p of [
      path.join(projectRoot, '.claude', 'CLAUDE.md'),
      path.join(projectRoot, 'CLAUDE.md'),
    ]) {
      if (fs.existsSync(p)) {
        const body = fs.readFileSync(p, 'utf8').trim();
        if (body && !body.startsWith('@')) {
          const stem = p.includes('.claude') ? 'claude-always' : 'claude-root';
          instructions.push(new InstructionFile(
            stem,
            p,
            'always',
            body,
            stem,
          ));
        }
        break; // use the first found
      }
    }

    // Rules
    const rulesDir = path.join(projectRoot, '.claude', 'rules');
    if (fs.existsSync(rulesDir)) {
      const files = await fg('**/*.md', { cwd: rulesDir, absolute: true });
      for (const filePath of files.sort()) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const { data, content, parseWarning } = matter(raw);
        const stem = path.basename(filePath, '.md');
        const body = content.trim();

        const paths: string[] = Array.isArray(data.paths) ? (data.paths as string[]) : [];

        if (Array.isArray(data.paths) && paths.length === 0) {
          // paths: [] -> manual (blocks auto-load)
          instructions.push(new InstructionFile(
            stem,
            filePath,
            'manual',
            body,
            stem,
          ));
        } else if (paths.length > 0) {
          instructions.push(new InstructionFile(
            stem,
            filePath,
            'scoped',
            body,
            stem,
            paths,
          ));
        } else if (isAiDecidedBody(body)) {
          const description = extractDescription(body);
          instructions.push(new InstructionFile(
            stem,
            filePath,
            'ai-decided',
            stripInTextCondition(body),
            stem,
            undefined,
            description,
          ));
        } else {
          instructions.push(new InstructionFile(
            stem,
            filePath,
            'always',
            body,
            stem,
            undefined,
            undefined,
            undefined,
            undefined,
            parseWarning,
          ));
        }
      }
    }

    return instructions;
  }
}

export class ClaudeCodeAgentImporter implements ImporterPlugin<AgentDefinition> {
  readonly agent = 'claude-code';
  readonly instructionType = 'agent';

  validate(_projectRoot: string): ValidationResult[] {
    return [];
  }

  async import(projectRoot: string): Promise<AgentDefinition[]> {
    const agents: AgentDefinition[] = [];
    const agentsDir = path.join(projectRoot, '.claude', 'agents');
    if (fs.existsSync(agentsDir)) {
      const files = await fg('**/*.md', { cwd: agentsDir, absolute: true });
      for (const filePath of files.sort()) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const { data, content } = matter(raw);
        const name = typeof data.name === 'string' ? data.name : path.basename(filePath, '.md');
        agents.push(new AgentDefinition(
          name,
          filePath,
          content.trim(),
          typeof data.description === 'string' ? data.description : undefined,
          typeof data.model === 'string' ? data.model : undefined,
          Array.isArray(data.tools) ? (data.tools as string[]) : undefined,
          ['claude-code'], // targets
        ));
      }
    }
    return agents;
  }
}

export default [
  new ClaudeCodeInstructionImporter(),
  new ClaudeCodeAgentImporter(),
];
