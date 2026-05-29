import type { AgentConfig, DiffEntry, InstructionType, WriteOptions } from 'agentconfig-api';

export interface IArtifactWriter {
  write(tempDir: string, outputDir: string, opts: WriteOptions): Promise<number>;
  computeDiff(tempDir: string, outputDir: string): Promise<DiffEntry[]>;
}

export interface IAgentConfigDirWriter {
  write(
    items: InstructionType[],
    config: AgentConfig,
    configDir: string,
    opts?: WriteOptions,
  ): Promise<void>;
}