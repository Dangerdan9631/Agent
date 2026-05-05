import type { InstructionType } from 'agentconfig-api';
import type { AgentConfig } from 'agentconfig-api';
import { registry } from '../registry';
import { parseInstructions } from './instruction';
import { parseAgents } from './agent';
import { parseSkills } from './skill';
import { parseCommands } from './command';
import { parseHooks } from './hook';

/**
 * Parse all artifacts from a `.agentconfig/` directory into a normalized IR.
 * Built-in directive types (instructions, agents, skills, commands, hooks) are
 * always parsed. Registered DirectiveTypePlugins are invoked for any additional
 * custom directive types.
 */
export async function parseArtifacts(
  configDir: string,
  _config: AgentConfig,
): Promise<InstructionType[]> {
  const [instructions, agents, commands] = await Promise.all([
    parseInstructions(configDir),
    parseAgents(configDir),
    parseCommands(configDir),
  ]);

  const skills = parseSkills(configDir);
  const hooks = parseHooks(configDir);

  const results: InstructionType[] = [
    ...instructions,
    ...agents,
    ...commands,
    ...skills,
    ...hooks,
  ];

  // Invoke registered directive type plugins
  for (const plugin of registry.listDirectiveTypes()) {
    const extensionItems = await Promise.resolve(plugin.parse(configDir));
    results.push(...extensionItems);
  }

  return results;
}
