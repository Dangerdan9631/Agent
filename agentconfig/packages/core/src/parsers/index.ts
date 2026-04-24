import type { IR } from '../types/ir';
import type { AgentConfig } from '../types/config';
import { parseInstructions } from './instruction';
import { parseAgents } from './agent';
import { parseSkills } from './skill';
import { parseCommands } from './command';
import { parseHooks } from './hook';

/**
 * Parse all artifacts from a `.agentconfig/` directory into a normalized IR.
 */
export async function parseArtifacts(
  configDir: string,
  _config: AgentConfig,
): Promise<IR> {
  const [instructions, agents, commands] = await Promise.all([
    parseInstructions(configDir),
    parseAgents(configDir),
    parseCommands(configDir),
  ]);

  const skills = parseSkills(configDir);
  const hooks = parseHooks(configDir);

  return { instructions, agents, skills, commands, hooks };
}
