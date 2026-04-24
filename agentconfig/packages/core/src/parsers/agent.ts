import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import fg from 'fast-glob';
import type { AgentDefinition } from '../types/ir';

const VALID_SANDBOX_MODES = new Set(['read-only', 'workspace-write', 'danger-full-access']);
const VALID_REASONING = new Set(['low', 'medium', 'high']);

export async function parseAgents(configDir: string): Promise<AgentDefinition[]> {
  const dir = path.join(configDir, 'agents');
  if (!fs.existsSync(dir)) return [];

  const filePaths = await fg('**/*.md', { cwd: dir, absolute: true });
  filePaths.sort();

  return filePaths.map((filePath) => {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(raw);

    const {
      name: nameField,
      description,
      model,
      tools,
      targets,
      excludedTargets,
      isolation,
      sandbox_mode,
      reasoning_effort,
      ...rest
    } = data as Record<string, unknown>;

    const name =
      typeof nameField === 'string' ? nameField : path.basename(filePath, '.md');

    return {
      name,
      sourcePath: filePath,
      description: typeof description === 'string' ? description : undefined,
      model: typeof model === 'string' ? model : undefined,
      tools: Array.isArray(tools) ? (tools as string[]) : undefined,
      targets: Array.isArray(targets) ? (targets as string[]) : undefined,
      excludedTargets: Array.isArray(excludedTargets)
        ? (excludedTargets as string[])
        : undefined,
      isolation: isolation === 'worktree' ? 'worktree' : null,
      sandbox_mode: VALID_SANDBOX_MODES.has(sandbox_mode as string)
        ? (sandbox_mode as AgentDefinition['sandbox_mode'])
        : undefined,
      reasoning_effort: VALID_REASONING.has(reasoning_effort as string)
        ? (reasoning_effort as AgentDefinition['reasoning_effort'])
        : undefined,
      body: content.trim(),
      extra: Object.keys(rest).length > 0 ? rest : undefined,
    };
  });
}
