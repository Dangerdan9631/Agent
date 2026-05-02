import { spawn } from 'child_process';
import path from 'path';
import chalk from 'chalk';

export function registerStart(program: import('commander').Command): void {
  program
    .command('start')
    .description('Start the overmind service process')
    .option('-f, --foreground', 'Run service in the foreground (log to stdout)')
    .action((opts: { foreground?: boolean }) => {
      let servicePath: string;
      try {
        const pkgDir = path.dirname(require.resolve('overmind-service/package.json'));
        servicePath = path.join(pkgDir, 'dist', 'index.js');
      } catch {
        console.error(chalk.red('Could not locate overmind-service. Run `npm run build` first.'));
        process.exit(1);
      }

      const stdio = opts.foreground ? 'inherit' : 'ignore';
      const child = spawn(process.execPath, [servicePath], {
        detached: !opts.foreground,
        stdio,
      });

      if (!opts.foreground) {
        child.unref();
        console.log(chalk.green(`Service started (pid ${child.pid})`));
      }
    });
}
