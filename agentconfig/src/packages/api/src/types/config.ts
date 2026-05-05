/** Runtime configuration loaded from `.agentconfig/agentconfig.yaml`. */
export interface AgentConfig {
  version: number;
  targets: string[];
  options: {
    output_dir: string;
  };
}
