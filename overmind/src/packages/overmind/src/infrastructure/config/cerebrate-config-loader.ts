import fs from 'node:fs';
import path from 'node:path';

import yaml from 'yaml';
import { z } from 'zod';

import type { CerebrateCommand } from '../../domain/cerebrate/cerebrate-command.js';
import type {
  CerebrateDefinition,
  WorkflowDefinition,
  WorkflowStateDefinition,
} from '../../domain/cerebrate/cerebrate-definition.js';

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

const workflowBranchConditionSchema = z.strictObject({
  outputContains: z.string().min(1).optional(),
  outputRegex: z.string().min(1).optional(),
  statusEquals: z.string().min(1).optional(),
}).superRefine((value, context) => {
  if (!value.outputContains && !value.outputRegex && !value.statusEquals) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Branch conditions must define at least one supported field.',
    });
  }

  if (value.outputRegex) {
    try {
      new RegExp(value.outputRegex);
    } catch (error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid outputRegex: ${(error as Error).message}`,
      });
    }
  }
});

const workflowBranchSchema = z.strictObject({
  when: workflowBranchConditionSchema,
  next: z.string().min(1),
});

const workflowStateSchema = z.strictObject({
  name: z.string().min(1),
  command: z.string().min(1),
  next: z.string().min(1),
  branches: z.array(workflowBranchSchema).default([]),
  onError: z.string().min(1).optional(),
});

const workflowDefinitionSchema = z.strictObject({
  name: z.string().min(1),
  initialState: z.string().min(1),
});

const cerebrateConfigFileSchema = z.strictObject({
  description: z.string(),
  taskId: z.string().regex(/^[A-Z]{4}$/),
  nextTaskNumber: z.number().int().min(1).default(1),
  responsibilities: z.string(),
  commands: z.array(cerebrateCommandSchema),
  states: z.array(workflowStateSchema).default([]),
  workflows: z.array(workflowDefinitionSchema).default([]),
}).superRefine((value, context) => {
  const commandNames = new Set(value.commands.map((command) => command.name));
  const stateNames = new Set<string>();
  const workflowNames = new Set<string>();

  for (const [index, state] of value.states.entries()) {
    if (state.name === 'END') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['states', index, 'name'],
        message: 'State name "END" is reserved.',
      });
    }

    if (stateNames.has(state.name)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['states', index, 'name'],
        message: `Duplicate state name "${state.name}".`,
      });
    } else {
      stateNames.add(state.name);
    }

    if (!commandNames.has(state.command)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['states', index, 'command'],
        message: `Unknown command "${state.command}".`,
      });
    }
  }

  const isValidTarget = (target: string): boolean => target === 'END' || stateNames.has(target);

  for (const [index, state] of value.states.entries()) {
    if (!isValidTarget(state.next)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['states', index, 'next'],
        message: `Unknown workflow target "${state.next}".`,
      });
    }

    if (state.onError && !isValidTarget(state.onError)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['states', index, 'onError'],
        message: `Unknown workflow target "${state.onError}".`,
      });
    }

    for (const [branchIndex, branch] of state.branches.entries()) {
      if (!isValidTarget(branch.next)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['states', index, 'branches', branchIndex, 'next'],
          message: `Unknown workflow target "${branch.next}".`,
        });
      }
    }
  }

  for (const [index, workflow] of value.workflows.entries()) {
    if (workflowNames.has(workflow.name)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['workflows', index, 'name'],
        message: `Duplicate workflow name "${workflow.name}".`,
      });
    } else {
      workflowNames.add(workflow.name);
    }

    if (!stateNames.has(workflow.initialState)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['workflows', index, 'initialState'],
        message: `Unknown initial state "${workflow.initialState}".`,
      });
    }
  }
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
  states: [],
  workflows: [],
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
    states: config.states as WorkflowStateDefinition[],
    workflows: config.workflows as WorkflowDefinition[],
    cerebrateDir,
  };
}
