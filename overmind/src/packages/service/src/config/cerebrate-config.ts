import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { z } from 'zod';

//
// *RawSchema types are used for parsing config files. Changes should be
// additive only. Remove values by making them optional. *BackCompat types
// transform the parsed raw types into the final types used by the code,
// allowing for older versions of the config to be migrated to the new schema
// on load.
//

// -----------------------------------------------------------------------------
//      Cerebrate Command Config
// -----------------------------------------------------------------------------
const cerebrateCommandTextRawSchema = z.strictObject({
    type: z.literal('text').readonly(),
    text: z.string().nonempty().readonly(),
});
const cerebrateCommandTextBackCompat = cerebrateCommandTextRawSchema.transform(raw => ({
    type: raw.type,
    text: raw.text,
}) as {
    readonly type: 'text';
    readonly text: string;
});
export type CerebrateCommandText = z.infer<typeof cerebrateCommandTextBackCompat>;

const cerebrateCommandFileRawSchema = z.strictObject({
    type: z.literal('file').readonly(),
    file: z.string().nonempty().readonly(),
});
const cerebrateCommandFileBackCompat = cerebrateCommandFileRawSchema.transform(raw => ({
    type: raw.type,
    file: raw.file,
}) as {
    readonly type: 'file';
    readonly file: string;
});
export type CerebrateCommandFile = z.infer<typeof cerebrateCommandFileBackCompat>;

const cerebrateCommandScriptRawSchema = z.strictObject({
    type: z.literal('script').readonly(),
    script: z.string().nonempty().readonly(),
});
const cerebrateCommandScriptBackCompat = cerebrateCommandScriptRawSchema.transform(raw => ({
    type: raw.type,
    script: raw.script,
}) as {
    readonly type: 'script';
    readonly script: string;
});
export type CerebrateCommandScript = z.infer<typeof cerebrateCommandScriptBackCompat>;

const cerebrateCommandRawSchema = z.strictObject({
    name: z.string().readonly(),
    value: z.discriminatedUnion(`type`, [
        cerebrateCommandTextRawSchema,
        cerebrateCommandFileRawSchema,
        cerebrateCommandScriptRawSchema,
    ]).readonly(),
});
const cerebrateCommandBackCompat = cerebrateCommandRawSchema.transform(raw => {
    return {
        name: raw.name,
        value: (() => {
            switch (raw.value.type) {
                case 'text':
                    return cerebrateCommandTextBackCompat.readonly().parse(raw.value);
                case 'file':
                    return cerebrateCommandFileBackCompat.readonly().parse(raw.value);
                case 'script':
                    return cerebrateCommandScriptBackCompat.readonly().parse(raw.value);
            };
        })(),
    } as {
        readonly name: string;
        readonly value: CerebrateCommandText | CerebrateCommandFile | CerebrateCommandScript;
    };
});
export type CerebrateCommand = z.infer<typeof cerebrateCommandBackCompat>;

// -----------------------------------------------------------------------------
//      Cerebrate Config
// -----------------------------------------------------------------------------

const cerebrateConfigRawSchema = z.strictObject({
    description: z.string().readonly(),
    taskId: z.string().regex(/^[A-Z]{4}$/).readonly(),
    nextTaskNumber: z.number().int().min(1).default(1),
    responsibilities: z.string().readonly(),
    commands: z.array(cerebrateCommandRawSchema).readonly(),
});
const cerebrateConfigBackCompat = cerebrateConfigRawSchema.transform(raw => ({
    description: raw.description,
    taskId: raw.taskId,
    nextTaskNumber: raw.nextTaskNumber,
    responsibilities: raw.responsibilities,
    commands: raw.commands.map(c => cerebrateCommandBackCompat.readonly().parse(c)),
}) as {
    readonly description: string;
    readonly taskId: string;
    nextTaskNumber: number;
    readonly responsibilities: string;
    readonly commands: CerebrateCommand[];
});
type CerebrateConfigParsed = z.infer<typeof cerebrateConfigBackCompat>;

const cerebrateConfigSchema = cerebrateConfigBackCompat.and(z.strictObject({
    cerebrateDir: z.string().readonly()
}));
export type CerebrateConfig = z.infer<typeof cerebrateConfigSchema>;

// -----------------------------------------------------------------------------
//      File Loading
// -----------------------------------------------------------------------------

const CEREBRATE_CONFIG_FILENAME = 'cerebrate-config.yaml';
export const DEFAULT_CEREBRATE_CONFIG: CerebrateConfigParsed = {
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
        }
    ],
};

export function loadCerebrateConfig(cerebrateDir: string, useDefault: boolean = true): CerebrateConfig {
    const configFilepath = path.join(cerebrateDir, CEREBRATE_CONFIG_FILENAME);
    if (!fs.existsSync(configFilepath)) {
        if (!useDefault) {
            throw new Error(
                `Missing ${CEREBRATE_CONFIG_FILENAME} at ${cerebrateDir}`);
        }
        fs.mkdirSync(cerebrateDir, { recursive: true });
        fs.writeFileSync(configFilepath, yaml.stringify(DEFAULT_CEREBRATE_CONFIG), 'utf8');
    }

    const raw = yaml.parse(
        fs.readFileSync(configFilepath, 'utf8')) as unknown;
    const parsed = cerebrateConfigBackCompat.safeParse(raw);
    if (!parsed.success) {
        throw new Error(
            `Invalid ${CEREBRATE_CONFIG_FILENAME}: ${parsed.error.message}`);
    }

    return {
        ...parsed.data,
        cerebrateDir,
    };
}
