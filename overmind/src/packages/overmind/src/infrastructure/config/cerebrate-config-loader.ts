import fs from 'node:fs';
import path from 'node:path';

import yaml from 'yaml';
import { z } from 'zod';

import type { CerebrateCommand } from '../../domain/cerebrate/cerebrate-command.js';
import type { CerebrateDefinition } from '../../domain/cerebrate/cerebrate-definition.js';

const cerebrateCommandSchema = z.strictObject({
  name: z.string().min(1),
  value: z.discriminatedUnion('type', [
    z.strictObject({
      type: z.literal('text'),
      text: z.string().min(1),
    }),
    z.strictObject({
      type: z.literal('file'),
      file: z.string().min(1),
    }),
    z.strictObject({
      type: z.literal('script'),
      script: z.string().min(1),
    }),
  ]),
});

const cerebrateConfigFileSchema = z.strictObject({
  description: z.string(),
  taskId: z.string().regex(/^[A-Z]{4}$/),
  nextTaskNumber: z.number().int().min(1).default(1),
  responsibilities: z.string(),
  commands: z.array(cerebrateCommandSchema),
});

export type CerebrateConfigFileData = z.infer<typeof cerebrateConfigFileSchema>;

export const CEREBRATE_CONFIG_FILENAME = 'cerebrate-config.yaml';

export const DEFAULT_CEREBRATE_CONFIG: CerebrateConfigFileData = {
  description: 'Runs the default hello cerebrate.',
  taskId: 'HELO',
  nextTaskNumber: 1,
  responsibilities: 'Handle the default hello cerebrate workflow.',
  commands: [
    {
      name: 'run',
      value: {
        type: 'text',
        text: 'Run the cerebrate loop.',
      },
    },
    {
      name: 'shutdown',
      value: {
        type: 'text',
        text: 'Stop the running cerebrate.',
      },
    },
    {
      name: 'attach',
      value: {
        type: 'text',
        text: 'Attach to the cerebrate output stream.',
      },
    },
  ],
};

export function ensureDefaultCerebrateConfig(cerebrateDir: string): void {
  const configFilePath = path.join(cerebrateDir, CEREBRATE_CONFIG_FILENAME);
  if (fs.existsSync(configFilePath)) {
    return;
  }

  fs.mkdirSync(cerebrateDir, { recursive: true });
  fs.writeFileSync(configFilePath, yaml.stringify(DEFAULT_CEREBRATE_CONFIG), 'utf8');
}

export function loadCerebrateConfig(cerebrateDir: string): CerebrateConfigFileData {
  const configFilePath = path.join(cerebrateDir, CEREBRATE_CONFIG_FILENAME);
  if (!fs.existsSync(configFilePath)) {
    throw new Error(`Missing ${CEREBRATE_CONFIG_FILENAME} at ${cerebrateDir}`);
  }

  const raw = yaml.parse(fs.readFileSync(configFilePath, 'utf8')) as unknown;
  const parsed = cerebrateConfigFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid ${CEREBRATE_CONFIG_FILENAME}: ${parsed.error.message}`);
  }

  return parsed.data;
}

export function loadCerebrateDefinition(cerebrateDir: string): CerebrateDefinition {
  const config = loadCerebrateConfig(cerebrateDir);

  return {
    name: path.basename(cerebrateDir),
    description: config.description,
    taskId: config.taskId,
    responsibilities: config.responsibilities,
    commands: config.commands as CerebrateCommand[],
    cerebrateDir,
  };
}
