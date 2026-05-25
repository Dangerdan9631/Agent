import fs from 'node:fs';
import path from 'node:path';

import yaml from 'yaml';
import { z } from 'zod';

import type { CerebrateDefinitionReader } from '../../application/ports/cerebrate-definition-reader.js';
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

const CEREBRATE_CONFIG_FILENAME = 'cerebrate-config.yaml';

export const DEFAULT_CEREBRATE_CONFIG: CerebrateConfigFileData = {
  description: 'says hello',
  taskId: 'HELO',
  nextTaskNumber: 1,
  responsibilities: 'say hello',
  commands: [
    {
      name: 'hello',
      value: {
        type: 'text',
        text: 'say hello',
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

export class FileSystemCerebrateDefinitionReader implements CerebrateDefinitionReader {
  read(cerebrateDir: string): CerebrateDefinition {
    const configFilePath = path.join(cerebrateDir, CEREBRATE_CONFIG_FILENAME);
    if (!fs.existsSync(configFilePath)) {
      throw new Error(`Missing ${CEREBRATE_CONFIG_FILENAME} at ${cerebrateDir}`);
    }

    const raw = yaml.parse(fs.readFileSync(configFilePath, 'utf8')) as unknown;
    const parsed = cerebrateConfigFileSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid ${CEREBRATE_CONFIG_FILENAME}: ${parsed.error.message}`);
    }

    return {
      name: path.basename(cerebrateDir),
      description: parsed.data.description,
      taskId: parsed.data.taskId,
      responsibilities: parsed.data.responsibilities,
      commands: parsed.data.commands as CerebrateCommand[],
      cerebrateDir,
    };
  }
}

export { CEREBRATE_CONFIG_FILENAME };
