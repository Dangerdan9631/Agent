import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import type { ImporterPlugin, ValidationResult, DetectedAgent } from 'agentconfig-api';
import { InstructionFile, AgentDefinition } from '../types';

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

export class CodexInstructionImporter implements ImporterPlugin<InstructionFile> {
  readonly agent = 'codex';
  readonly instructionType = 'instruction';

  validate(_projectRoot: string): ValidationResult[] {
    return [];
  }

  async import(projectRoot: string): Promise<InstructionFile[]> {
    const instructions: InstructionFile[] = [];

    // Always: AGENTS.md at repo root
    const agentsMd = path.join(projectRoot, 'AGENTS.md');
    if (fs.existsSync(agentsMd)) {
      const body = fs.readFileSync(agentsMd, 'utf8').trim();
      if (body) {
        instructions.push(new InstructionFile(
          'agents',
          agentsMd,
          'always',
          body,
          'agents',
          undefined,
          undefined,
          undefined,
          undefined,
          '# TODO: verify activation — AGENTS.md may contain mixed always + ai-decided sections'
        ));
      }
    }

    // Manual: .codex/instructions/
    const instrDir = path.join(projectRoot, '.codex', 'instructions');
    if (fs.existsSync(instrDir)) {
      const files = await fg('**/*.md', { cwd: instrDir, absolute: true });
      for (const filePath of files.sort()) {
        const body = fs.readFileSync(filePath, 'utf8').trim();
        const stem = path.basename(filePath, '.md');
        instructions.push(new InstructionFile(
          stem,
          filePath,
          'manual',
          body,
          stem,
        ));
      }
    }

    return instructions;
  }
}

export class CodexAgentImporter implements ImporterPlugin<AgentDefinition> {
  readonly agent = 'codex';
  readonly instructionType = 'agent';

  validate(_projectRoot: string): ValidationResult[] {
    return [];
  }

  async import(projectRoot: string): Promise<AgentDefinition[]> {
    const agents: AgentDefinition[] = [];
    const agentsDir = path.join(projectRoot, '.codex', 'agents');
    if (fs.existsSync(agentsDir)) {
      const files = await fg('**/*.toml', { cwd: agentsDir, absolute: true });
      for (const filePath of files.sort()) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = parseTOMLSimple(raw);
        const name = typeof data.name === 'string' ? data.name : path.basename(filePath, '.toml');
        
        agents.push(new AgentDefinition(
          name,
          filePath,
          typeof data.developer_instructions === 'string' ? data.developer_instructions : '',
          typeof data.description === 'string' ? data.description : undefined,
          typeof data.model === 'string' ? data.model : undefined,
          undefined, // tools
          ['codex'], // targets
          undefined, // excludedTargets
          undefined, // isolation
          (['read-only', 'workspace-write', 'danger-full-access'] as const).includes(data.sandbox_mode as any) ? data.sandbox_mode as any : undefined,
          (['low', 'medium', 'high'] as const).includes(data.model_reasoning_effort as any) ? data.model_reasoning_effort as any : undefined,
        ));
      }
    }
    return agents;
  }
}

export default [
  new CodexInstructionImporter(),
  new CodexAgentImporter(),
];
