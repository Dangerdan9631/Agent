import { z } from 'zod';

export const AgentConfigSchema = z.object({
  version: z.number().int().positive().default(1),
  targets: z.array(z.string()).default([]),
  options: z
    .object({
      overwrite: z.boolean().default(true),
      output_dir: z.string().default('.'),
    })
    .default({}),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
