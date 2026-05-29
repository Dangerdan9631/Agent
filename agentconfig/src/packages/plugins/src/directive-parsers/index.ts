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
export {
  parseInstructions,
  parseAgents,
  parseSkills,
  parseCommands,
  parseHooks,
};
