import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import type { InstructionFile, AgentDefinition } from '../types/ir';
import type { DetectedAgent } from '../types/generator';

/** Detect whether a Codex configuration is present in `dir`. */
export function detectCodex(dir: string): DetectedAgent[] {
  if (fs.existsSync(path.join(dir, '.codex'))) {
    return [{ name: 'codex', confidence: 'high' }];
  }
  if (fs.existsSync(path.join(dir, 'AGENTS.md'))) {
    return [{ name: 'codex', confidence: 'low' }];
  }
  return [];
}

function parseTOMLSimple(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');
  let multilineKey: string | null = null;
  const multilineLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (multilineKey !== null) {
      if (trimmed === '"""') {
        result[multilineKey] = multilineLines.join('\n');
        multilineKey = null;
        multilineLines.length = 0;
      } else {
        multilineLines.push(line);
      }
      continue;
    }

    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('[')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();

    if (val === '"""') {
      multilineKey = key;
      continue;
    }

    if (val.startsWith('"') && val.endsWith('"')) {
      result[key] = val.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    } else if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1);
      result[key] = inner
        .split(',')
        .map((s) => s.trim().replace(/^"|"$/g, ''))
        .filter(Boolean);
    } else if (val === 'true') {
      result[key] = true;
    } else if (val === 'false') {
      result[key] = false;
    } else if (!isNaN(Number(val))) {
      result[key] = Number(val);
    } else {
      result[key] = val;
    }
  }

  return result;
}

/**
 * Import instructions and agents from a Codex project.
 * Reads:
 *   AGENTS.md                      → always instruction
 *   .codex/instructions/*.md       → manual instruction
 *   .codex/agents/*.toml           → AgentDefinition
 */
export async function importCodex(sourceDir: string): Promise<{
  instructions: InstructionFile[];
  agents: AgentDefinition[];
}> {
  const instructions: InstructionFile[] = [];
  const agents: AgentDefinition[] = [];

  // Always: AGENTS.md at repo root
  const agentsMd = path.join(sourceDir, 'AGENTS.md');
  if (fs.existsSync(agentsMd)) {
    const body = fs.readFileSync(agentsMd, 'utf8').trim();
    if (body) {
      instructions.push({
        name: 'agents',
        sourcePath: agentsMd,
        activation: 'always',
        slug: 'agents',
        body,
        importNote:
          '# TODO: verify activation — AGENTS.md may contain mixed always + ai-decided sections',
      });
    }
  }

  // Manual: .codex/instructions/
  const instrDir = path.join(sourceDir, '.codex', 'instructions');
  if (fs.existsSync(instrDir)) {
    const files = await fg('**/*.md', { cwd: instrDir, absolute: true });
    for (const filePath of files.sort()) {
      const body = fs.readFileSync(filePath, 'utf8').trim();
      const stem = path.basename(filePath, '.md');
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: 'manual',
        slug: stem,
        body,
      });
    }
  }

  // Agents: .codex/agents/*.toml
  const agentsDir = path.join(sourceDir, '.codex', 'agents');
  if (fs.existsSync(agentsDir)) {
    const files = await fg('**/*.toml', { cwd: agentsDir, absolute: true });
    for (const filePath of files.sort()) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = parseTOMLSimple(raw);
      const name =
        typeof data.name === 'string' ? data.name : path.basename(filePath, '.toml');
      agents.push({
        name,
        sourcePath: filePath,
        description: typeof data.description === 'string' ? data.description : undefined,
        model: typeof data.model === 'string' ? data.model : undefined,
        reasoning_effort: (
          ['low', 'medium', 'high'] as const
        ).includes(data.model_reasoning_effort as 'low' | 'medium' | 'high')
          ? (data.model_reasoning_effort as 'low' | 'medium' | 'high')
          : undefined,
        sandbox_mode: (
          ['read-only', 'workspace-write', 'danger-full-access'] as const
        ).includes(data.sandbox_mode as AgentDefinition['sandbox_mode'])
          ? (data.sandbox_mode as AgentDefinition['sandbox_mode'])
          : undefined,
        targets: ['codex'],
        body:
          typeof data.developer_instructions === 'string' ? data.developer_instructions : '',
      });
    }
  }

  return { instructions, agents };
}
