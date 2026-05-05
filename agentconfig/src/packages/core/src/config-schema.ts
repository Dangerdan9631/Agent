import { z } from 'zod';
export const AgentConfigSchema = z.object({
  version: z.number().int().positive().default(1),
  targets: z.array(z.string()).default([]),
  options: z
    .object({
      output_dir: z.string().default('.'),
    })
    .default({ output_dir: '.' }),
  last_generated: z.string().optional(),
});

