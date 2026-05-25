import fs from 'node:fs';
import path from 'node:path';

import yaml from 'yaml';
import { z } from 'zod';

const llmAgentSchema = z.enum([
  'claude-code',
  'codex-cli',
  'copilot-cli',
  'cursor-cli',
  'gemini-cli',
  'windsurf-cli',
]);

const llmThinkingSchema = z.enum(['none', 'low', 'medium', 'high']);
const llmDifficultySchema = z.enum(['trivial', 'easy', 'medium', 'hard']);

const llmAgentConfigSchema = z.strictObject({
  agent: llmAgentSchema,
  model: z.string().min(1),
  thinking: llmThinkingSchema.optional(),
});

const llmChainSchema = z.strictObject({
  difficulty: llmDifficultySchema.optional(),
  effort: llmThinkingSchema.optional(),
  agents: z.array(llmAgentConfigSchema).min(1),
});

const overmindConfigFileSchema = z.strictObject({
  name: z.string().default('overmind'),
  version: z.number().default(1),
  llm: z.strictObject({
    chain: z.array(llmChainSchema).min(1),
  }),
});

export type ConfiguredLlmAgent = z.infer<typeof llmAgentConfigSchema>;
export type ConfiguredLlmChain = z.infer<typeof llmChainSchema>;
export type OvermindConfigFileData = z.infer<typeof overmindConfigFileSchema>;
export type OvermindConfig = OvermindConfigFileData & { configDir: string };

const OVERMIND_CONFIG_FILENAME = 'overmind-config.yaml';

export const DEFAULT_OVERMIND_CONFIG: OvermindConfigFileData = {
  name: 'overmind',
  version: 1,
  llm: {
    chain: [
      {
        agents: [
          {
            agent: 'copilot-cli',
            model: 'gpt-5-mini',
          },
        ],
      },
    ],
  },
};

export function ensureOvermindConfig(configDir: string): void {
  const configFilePath = path.join(configDir, OVERMIND_CONFIG_FILENAME);
  if (fs.existsSync(configFilePath)) {
    return;
  }

  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configFilePath, yaml.stringify(DEFAULT_OVERMIND_CONFIG), 'utf8');
}

export function loadOvermindConfig(configDir: string): OvermindConfig {
  const configFilePath = path.join(configDir, OVERMIND_CONFIG_FILENAME);
  if (!fs.existsSync(configFilePath)) {
    throw new Error(`Missing ${OVERMIND_CONFIG_FILENAME} at ${configFilePath}`);
  }

  const raw = yaml.parse(fs.readFileSync(configFilePath, 'utf8')) as unknown;
  const parsed = overmindConfigFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid ${OVERMIND_CONFIG_FILENAME}: ${parsed.error.message}`);
  }

  return {
    ...parsed.data,
    configDir,
  };
}
