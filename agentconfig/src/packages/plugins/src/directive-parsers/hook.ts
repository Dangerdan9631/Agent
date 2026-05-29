import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';
import { HookDefinition } from '../directive-types/hook';

const HOOK_EVENTS = [
  'SessionStart',
  'SessionEnd',
  'PreToolUse',
  'PostToolUse',
  'SubagentStart',
  'SubagentStop',
  'PreCompact',
  'UserPromptSubmit',
  'PermissionRequest',
] as const;

const HookSchema = z.object({
  name: z.string(),
  event: z.enum(HOOK_EVENTS),
  matcher: z.string().optional(),
  type: z.enum(['command', 'http', 'prompt', 'agent']).default('command'),
  command: z.string().optional(),
  timeout: z.number().optional(),
  blocking: z.boolean().optional(),
  async: z.boolean().optional(),
  targets: z.array(z.string()).optional(),
  excludedTargets: z.array(z.string()).optional(),
});

const HooksYamlSchema = z.object({
  hooks: z.array(HookSchema).default([]),
});

export function parseHooks(configDir: string): HookDefinition[] {
  const hooksFile = path.join(configDir, 'hooks', 'hooks.yaml');
  if (!fs.existsSync(hooksFile)) return [];

  const raw = yaml.load(fs.readFileSync(hooksFile, 'utf8')) as unknown;
  const parsed = HooksYamlSchema.parse(raw);
  return parsed.hooks.map(
    (h) =>
      new HookDefinition(
        h.name,
        h.event,
        h.type as any,
        h.matcher,
        h.command,
        h.timeout,
        h.blocking,
        h.async,
        h.targets,
        h.excludedTargets
      )
  );
}
