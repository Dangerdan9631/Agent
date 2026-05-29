import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import fg from 'fast-glob';
import { AgentDefinition } from '../directive-types/agent';

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

    return new AgentDefinition(
      name,
      filePath,
      content.trim(),
      typeof description === 'string' ? description : undefined,
      typeof model === 'string' ? model : undefined,
      Array.isArray(tools) ? (tools as string[]) : undefined,
      Array.isArray(targets) ? (targets as string[]) : undefined,
      Array.isArray(excludedTargets) ? (excludedTargets as string[]) : undefined,
      isolation === 'worktree' ? 'worktree' : null,
      VALID_SANDBOX_MODES.has(sandbox_mode as string) ? (sandbox_mode as any) : undefined,
      VALID_REASONING.has(reasoning_effort as string) ? (reasoning_effort as any) : undefined,
      Object.keys(rest).length > 0 ? rest : undefined
    );
  });
}
