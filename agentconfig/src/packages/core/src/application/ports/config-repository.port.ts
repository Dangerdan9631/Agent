import type { AgentConfig } from 'agentconfig-api';

export interface IConfigRepository {
  findConfigDir(startDir: string): string | null;
  resolveConfigDir(startDir?: string): string;
  loadConfig(configDir: string, overrides?: Partial<AgentConfig>): Promise<AgentConfig>;
  saveConfig(configDir: string, config: AgentConfig): Promise<void>;
}