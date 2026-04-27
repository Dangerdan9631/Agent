import type { IR, IRExtensions } from '../types/ir';
import type { AgentConfig } from '../types/config';
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
 * custom directive types, with results stored in `ir.extensions`.
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

  // Invoke registered directive type plugins
  const extensions: IRExtensions = {};
  for (const plugin of registry.listDirectiveTypes()) {
    extensions[plugin.typeId] = await Promise.resolve(plugin.parse(configDir));
  }

  return { instructions, agents, skills, commands, hooks, extensions };
}
