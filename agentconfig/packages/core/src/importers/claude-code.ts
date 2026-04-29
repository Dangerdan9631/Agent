import * as fs from 'node:fs';
import * as path from 'node:path';
import { safeMatter as matter } from '../utils';
import fg from 'fast-glob';
import type { InstructionFile, AgentDefinition } from '../types/ir';
import type { DetectedAgent } from '../types/generator';

/** Detect whether a Claude Code configuration is present in `dir`. */
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

/**
 * Import instructions and agents from a Claude Code project.
 * Reads:
 *   .claude/CLAUDE.md              → always instruction
 *   .claude/rules/*.md             → scoped / ai-decided / manual / always
 *   .claude/agents/*.md            → AgentDefinition
 */
export async function importClaudeCode(sourceDir: string): Promise<{
  instructions: InstructionFile[];
  agents: AgentDefinition[];
}> {
  const instructions: InstructionFile[] = [];
  const agents: AgentDefinition[] = [];

  // Always: .claude/CLAUDE.md (or root CLAUDE.md)
  for (const p of [
    path.join(sourceDir, '.claude', 'CLAUDE.md'),
    path.join(sourceDir, 'CLAUDE.md'),
  ]) {
    if (fs.existsSync(p)) {
      const body = fs.readFileSync(p, 'utf8').trim();
      if (body && !body.startsWith('@')) {
        // Skip pure @-import files
        const stem = p.includes('.claude') ? 'claude-always' : 'claude-root';
        instructions.push({
          name: stem,
          sourcePath: p,
          activation: 'always',
          slug: stem,
          body,
        });
      }
      break; // use the first found
    }
  }

  // Rules
  const rulesDir = path.join(sourceDir, '.claude', 'rules');
  if (fs.existsSync(rulesDir)) {
    const files = await fg('**/*.md', { cwd: rulesDir, absolute: true });
    for (const filePath of files.sort()) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const { data, content, parseWarning } = matter(raw);
      const stem = path.basename(filePath, '.md');
      const body = content.trim();

      const paths: string[] = Array.isArray(data.paths) ? (data.paths as string[]) : [];

      if (Array.isArray(data.paths) && paths.length === 0) {
        // paths: [] → manual (blocks auto-load)
        instructions.push({
          name: stem,
          sourcePath: filePath,
          activation: 'manual',
          slug: stem,
          body,
        });
      } else if (paths.length > 0) {
        instructions.push({
          name: stem,
          sourcePath: filePath,
          activation: 'scoped',
          globs: paths,
          slug: stem,
          body,
        });
      } else if (isAiDecidedBody(body)) {
        const description = extractDescription(body);
        instructions.push({
          name: stem,
          sourcePath: filePath,
          activation: 'ai-decided',
          description,
          slug: stem,
          body: stripInTextCondition(body),
        });
      } else {
        instructions.push({
          name: stem,
          sourcePath: filePath,
          activation: 'always',
          slug: stem,
          body,
          ...(parseWarning ? { importNote: parseWarning } : {}),
        });
      }
    }
  }

  // Agents
  const agentsDir = path.join(sourceDir, '.claude', 'agents');
  if (fs.existsSync(agentsDir)) {
    const files = await fg('**/*.md', { cwd: agentsDir, absolute: true });
    for (const filePath of files.sort()) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(raw);
      const name =
        typeof data.name === 'string' ? data.name : path.basename(filePath, '.md');
      agents.push({
        name,
        sourcePath: filePath,
        description: typeof data.description === 'string' ? data.description : undefined,
        model: typeof data.model === 'string' ? data.model : undefined,
        tools: Array.isArray(data.tools) ? (data.tools as string[]) : undefined,
        targets: ['claude-code'],
        body: content.trim(),
      });
    }
  }

  return { instructions, agents };
}
