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
//      LLM Config
// -----------------------------------------------------------------------------
const llmAgentRawSchema = z.enum([
    'claude-code',
    'codex-cli',
    'copilot-cli',
    'cursor-cli',
    'gemini-cli',
    'windsufr-cli',
]);
const llmAgentBackCompat = llmAgentRawSchema.transform(agent => {
    switch (agent) {
        default:
            return agent;
    }
})
export type LlmAgent = z.infer<typeof llmAgentBackCompat>;

const llmThinkingLevelRawSchema = z.enum(['none', 'low', 'medium', 'high']);
const llmThinkingLevelBackCompat = llmThinkingLevelRawSchema.transform(level => {
    switch (level) {
        default:
            return level;
    }
});
export type LlmThinkingLevel = z.infer<typeof llmThinkingLevelBackCompat>;

const llmModelRawSchema = z.strictObject({
    agent: llmAgentRawSchema.readonly(),
    model: z.string().readonly(),
    thinking: llmThinkingLevelRawSchema.optional().readonly(),
});
const llmModelBackCompat = llmModelRawSchema.readonly().transform(raw => {
    return {
        agent: llmAgentBackCompat.readonly().parse(raw.agent),
        model: raw.model,
        thinking: llmThinkingLevelBackCompat.optional().readonly().parse(raw.thinking)
    } as {
        readonly agent: LlmAgent;
        readonly model: string;
        readonly thinking?: LlmThinkingLevel;
    };
});
export type LlmModel = z.infer<typeof llmModelBackCompat>;

const llmChainDifficultyRawSchema = z.enum(['trivial', 'easy', 'medium', 'hard']);
const llmChainDifficultyBackCompat = llmChainDifficultyRawSchema.transform(difficulty => {
    switch (difficulty) {
        default:
            return difficulty;
    }
});
export type LlmChainDifficulty = z.infer<typeof llmChainDifficultyBackCompat>;

const llmChainEffortRawSchema = z.enum(['none', 'low', 'medium', 'high']);
const llmChainEffortBackCompat = llmChainEffortRawSchema.transform(effort => {
    switch (effort) {
        default:
            return effort;
    }
});
export type LlmChainEffort = z.infer<typeof llmChainEffortBackCompat>;

const llmChainRawSchema = z.strictObject({
    difficulty: llmChainDifficultyRawSchema.optional().readonly(),
    effort: llmChainEffortRawSchema.optional().readonly(),
    agents: z.array(llmModelRawSchema).min(1).readonly(),
});
const llmChainBackCompat = llmChainRawSchema.readonly().transform(raw => {
    return {
        agents: raw.agents.map(a => llmModelBackCompat.readonly().parse(a)),
        difficulty: llmChainDifficultyBackCompat.optional().readonly().parse(raw.difficulty),
        effort: llmChainEffortBackCompat.optional().readonly().parse(raw.effort),
    } as {
        readonly difficulty?: LlmChainDifficulty;
        readonly effort?: LlmChainEffort;
        readonly agents: LlmModel[];
    };
});
export type LlmChain = z.infer<typeof llmChainBackCompat>;

const llmConfigRawSchema = z.strictObject({
    chain: z.array(llmChainRawSchema).min(1).readonly(),
});
const llmConfigBackCompat = llmConfigRawSchema.transform(raw => ({
    chain: raw.chain.map(chain => llmChainBackCompat.readonly().parse(chain)),
}) as {
    readonly chain: LlmChain[];
});
export type LlmConfig = z.infer<typeof llmConfigBackCompat>;

// -----------------------------------------------------------------------------
//      Overmind Config
// -----------------------------------------------------------------------------

const overmindConfigRawSchema = z.strictObject({
    name: z.string().readonly().default('overmind'),
    version: z.number().readonly().default(1),
    llm: llmConfigRawSchema.readonly(),
});
const overmindConfigBackCompat = overmindConfigRawSchema.transform(raw => ({
    name: raw.name ?? 'overmind',
    version: raw.version ?? 1,
    llm: llmConfigBackCompat.readonly().parse(raw.llm),
}) as {
    readonly name: string;
    readonly version: number;
    readonly llm: LlmConfig;
});
type OvermindConfigParsed = z.infer<typeof overmindConfigBackCompat>;

const overmindConfigSchema = overmindConfigBackCompat.and(z.strictObject({
    configDir: z.string().readonly(),
}));
export type OvermindConfig = z.infer<typeof overmindConfigSchema>;

// -----------------------------------------------------------------------------
//      File Loading
// -----------------------------------------------------------------------------

const OVERMIND_CONFIG_FILENAME = 'overmind-config.yaml';
export const DEFAULT_OVERMIND_CONFIG: OvermindConfigParsed = {
    name: 'overmind',
    version: 1,
    llm: {
        chain: [
            {
                agents: [
                    {
                        agent: 'copilot-cli',
                        model: 'gpt-5-mini',
                    }
                ]
            }
        ]
    },
};

export function loadOvermindConfig(configDir: string, useDefault: boolean = true): OvermindConfig {
    const configFilepath = path.join(configDir, OVERMIND_CONFIG_FILENAME);
    if (!fs.existsSync(configFilepath)) {
        if (!useDefault) {
            throw new Error(
                `Missing overmind-config.yaml at ${configFilepath}`);
        }
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(configFilepath, yaml.stringify(DEFAULT_OVERMIND_CONFIG), 'utf8');
    }

    const raw = yaml.parse(
        fs.readFileSync(configFilepath, 'utf8')) as unknown;
    const parsed = overmindConfigBackCompat.safeParse(raw);
    if (!parsed.success) {
        throw new Error(
            `Invalid overmind-config.yaml: ${parsed.error.message}`);
    }

    return {
        ...parsed.data,
        configDir,
    };
}
