import type { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'node:path';
import type { IAgentConfigApi } from 'agentconfig-api';

export function registerInitialize(program: Command, api: IAgentConfigApi): void {
  program
    .command('initialize [project-root]')
    .alias('init')
    .description('Create an .agentconfig/ directory initialized from existing agent-native files.')
    .option('--config <path>', 'Output .agentconfig/ directory (default: <project-root>/.agentconfig)')
    .option('-v, --verbose', 'Verbose output', false)
    .option('--target <agent>', 'Import only from a specific agent', (v, p: string[]) => [...p, v], [] as string[])
    .action(async (projectRootArg: string | undefined, _cmdOpts: Record<string, unknown>, cmd) => {
      const opts = cmd.opts() as {
        config?: string;
        verbose: boolean;
        target: string[];
      };

      const projectRoot = projectRootArg ? path.resolve(projectRootArg) : process.cwd();

      const result = await api.initialize({
        projectRoot,
        configPath: opts.config,
        target: opts.target,
      }).catch((err: unknown) => {
        console.error(chalk.red('error:'), err instanceof Error ? err.message : String(err));
        process.exit(1);
      });

      if (result.detectedAgents.length === 0) {
        console.log(chalk.yellow('No agent-native files detected in ' + result.sourceDir));
        return;
      }

      if (opts.verbose) {
        console.log(chalk.gray(
          'Detected agents: ' + result.detectedAgents.map((a) => `${a.name} (${a.confidence})`).join(', '),
        ));
      }

      const summary = `Initialized ${result.instructionCount} instruction(s), ${result.agentCount} agent(s)`;
      console.log(chalk.green(`${summary} → ${result.configDir}`));
    });
}
