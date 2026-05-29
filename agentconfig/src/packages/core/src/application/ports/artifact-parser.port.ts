import type { AgentConfig, InstructionType } from 'agentconfig-api';

export interface IArtifactParser {
  parse(configDir: string, config: AgentConfig): Promise<InstructionType[]>;
}