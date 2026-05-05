import { z } from 'zod';
import type { AgentConfig as _AgentConfig } from 'agentconfig-api';

export const AgentConfigSchema = z.object({
  version: z.number().int().positive().default(1),
  targets: z.array(z.string()).default([]),
  options: z
    .object({
      output_dir: z.string().default('.'),
    })
    .default({ output_dir: '.' }),
});

/**
 * Re-exported from agentconfig-api so all internal code can continue to import
 * `AgentConfig` from `'./types/config'` without change.
 *
 * The Zod-inferred shape is structurally identical to the plain interface
 * declared in agentconfig-api, so they are fully assignable to each other.
 */
export type AgentConfig = _AgentConfig;
