import { program } from 'commander';
import chalk from 'chalk';
import * as path from 'node:path';
import * as fs from 'node:fs';
import {
  findConfigDir,
  loadConfig,
  parseArtifacts,
  generate,
  write,
  computeDiff,
  validate,
  importArtifacts,
  detectAgents,
  writeAgentConfigDir,
  registry,
  loadPlugins,
} from 'agentconfig';
import type { ValidationResult, DiffEntry } from 'agentconfig';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function die(msg: string, code = 1): never {
  console.error(chalk.red('error:'), msg);
  process.exit(code);
}

function info(verbose: boolean, msg: string): void {
  if (verbose) console.log(chalk.gray(msg));
}

async function resolveConfigDir(
  configPath: string | undefined,
): Promise<string> {
  const startDir = configPath
    ? path.resolve(configPath)
    : process.cwd();
  const configDir = findConfigDir(startDir);
  if (!configDir) {
    die(
      `No .agentconfig/ directory found starting from ${startDir}.\n` +
        `Run in a directory that contains .agentconfig/ or use --config <path>.`,
    );
  }
  return configDir;
}

function printValidation(
  results: ValidationResult[],
  format: 'text' | 'json',
  strict: boolean,
): void {
  if (format === 'json') {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  const errors = results.filter((r) => r.severity === 'error');
  const warnings = results.filter((r) => r.severity === 'warning');
  const infos = results.filter((r) => r.severity === 'info');

  for (const r of errors) {
    console.error(chalk.red(`[error] ${r.message}`) + (r.file ? chalk.gray(` (${r.file})`) : ''));
  }
  for (const r of warnings) {
    console.warn(chalk.yellow(`[warn]  ${r.message}`) + (r.file ? chalk.gray(` (${r.file})`) : ''));
  }
  for (const r of infos) {
    console.info(chalk.cyan(`[info]  ${r.message}`) + (r.file ? chalk.gray(` (${r.file})`) : ''));
  }

  if (errors.length > 0) {
    console.error(chalk.red(`\n${errors.length} error(s) found.`));
  } else if (strict && warnings.length > 0) {
    console.error(chalk.yellow(`\n${warnings.length} warning(s) found (--strict).`));
  } else if (results.length === 0) {
    console.log(chalk.green('No issues found.'));
  }
}

function printDiff(diff: DiffEntry[], format: 'text' | 'json'): void {
  if (format === 'json') {
    console.log(JSON.stringify(diff, null, 2));
    return;
  }
  for (const entry of diff) {
    const label =
      entry.status === 'created'
        ? chalk.green('+ ' + entry.path)
        : entry.status === 'deleted'
          ? chalk.red('- ' + entry.path)
          : chalk.yellow('~ ' + entry.path);
    console.log(label);
    if (entry.diff) {
      const lines = entry.diff.split('\n');
      for (const line of lines) {
        if (line.startsWith('+')) console.log(chalk.green(line));
        else if (line.startsWith('-')) console.log(chalk.red(line));
        else console.log(chalk.gray(line));
      }
    }
  }
  if (diff.length === 0) {
    console.log(chalk.green('No changes.'));
  }
}

// ─── Program ─────────────────────────────────────────────────────────────────

program
  .name('agentconfig')
  .description('Manage AI coding agent directive files from a single .agentconfig/ source of truth.')
  .version('0.1.0')
  .option('--config <path>', 'Path to .agentconfig/ directory (default: auto-detect)')
  .option('--out <path>', 'Override output_dir from config')
  .option('--target <name>', 'Generate for specific target(s)', (val, prev: string[]) => [...prev, val], [] as string[])
  .option('-v, --verbose', 'Verbose output', false)
  .option('--format <text|json>', 'Output format', 'text');

// ─── generate ─────────────────────────────────────────────────────────────────

program
  .command('generate')
  .alias('gen')
  .description('Parse .agentconfig/ and write agent-native directive files.')
  .option('--dry-run', 'Preview changes without writing to disk', false)
  .option('--no-overwrite', 'Skip files that already exist on disk')
  .option('--watch', 'Watch .agentconfig/ for changes and re-generate', false)
  .action(async (cmdOpts, cmd) => {
    const opts = cmd.optsWithGlobals<{
      config?: string;
      out?: string;
      target: string[];
      verbose: boolean;
      format: 'text' | 'json';
      dryRun: boolean;
      overwrite: boolean;
      watch: boolean;
    }>();

    const configDir = await resolveConfigDir(opts.config);
    const config = await loadConfig(configDir, {
      ...(opts.out ? { output_dir: opts.out } : {}),
    });

    await loadPlugins(config);

    info(opts.verbose, `Using config dir: ${configDir}`);
    info(opts.verbose, `Targets: ${(opts.target.length ? opts.target : config.targets).join(', ')}`);

    async function runGenerate(): Promise<void> {
      const ir = await parseArtifacts(configDir, config);
      const validResults = validate(ir, config);
      const errors = validResults.filter((r) => r.severity === 'error');
      if (errors.length > 0) {
        for (const e of errors) console.error(chalk.red(`[error] ${e.message}`));
        die('Validation errors found. Fix them before generating.');
      }

      const files = generate(ir, config, opts.target.length > 0 ? opts.target : undefined);
      const outputDir = path.resolve(path.dirname(configDir), config.options.output_dir);

      if (opts.dryRun) {
        const diff = computeDiff(files, outputDir);
        printDiff(diff, opts.format as 'text' | 'json');
        console.log(chalk.cyan('\n(dry run — no files written)'));
        return;
      }

      await write(files, {
        outputDir,
        overwrite: opts.overwrite,
        dryRun: false,
        verbose: opts.verbose,
      });

      console.log(chalk.green(`Generated ${files.length} file(s) → ${outputDir}`));
    }

    await runGenerate();

    if (opts.watch) {
      const { default: chokidar } = await import('chokidar');
      console.log(chalk.cyan(`\nWatching ${configDir} for changes...`));
      const watcher = chokidar.watch(configDir, { ignoreInitial: true });
      let busy = false;
      const onChange = async (p: string) => {
        if (busy) return;
        busy = true;
        info(opts.verbose, `Change detected: ${p}`);
        try {
          await runGenerate();
        } catch (err) {
          console.error(chalk.red('Generate error:'), err);
        } finally {
          busy = false;
        }
      };
      watcher.on('add', onChange).on('change', onChange).on('unlink', onChange);
    }
  });

// ─── validate ─────────────────────────────────────────────────────────────────

program
  .command('validate')
  .description('Validate .agentconfig/ without generating files.')
  .option('--strict', 'Treat warnings as errors', false)
  .action(async (cmdOpts, cmd) => {
    const opts = cmd.optsWithGlobals<{
      config?: string;
      target: string[];
      verbose: boolean;
      format: string;
      strict: boolean;
    }>();

    const configDir = await resolveConfigDir(opts.config);
    const config = await loadConfig(configDir);
    const ir = await parseArtifacts(configDir, config);
    const results = validate(ir, config);

    printValidation(results, opts.format as 'text' | 'json', opts.strict);

    const errors = results.filter((r) => r.severity === 'error');
    const warnings = results.filter((r) => r.severity === 'warning');
    if (errors.length > 0 || (opts.strict && warnings.length > 0)) {
      process.exit(1);
    }
  });

// ─── diff ─────────────────────────────────────────────────────────────────────

program
  .command('diff')
  .description('Show diff between .agentconfig/ source and current on-disk generated files.')
  .action(async (cmdOpts, cmd) => {
    const opts = cmd.optsWithGlobals<{
      config?: string;
      out?: string;
      target: string[];
      verbose: boolean;
      format: string;
    }>();

    const configDir = await resolveConfigDir(opts.config);
    const config = await loadConfig(configDir, {
      ...(opts.out ? { output_dir: opts.out } : {}),
    });
    await loadPlugins(config);

    const ir = await parseArtifacts(configDir, config);
    const files = generate(ir, config, opts.target.length > 0 ? opts.target : undefined);
    const outputDir = path.resolve(path.dirname(configDir), config.options.output_dir);
    const diff = computeDiff(files, outputDir);

    printDiff(diff, opts.format as 'text' | 'json');
    if (diff.length > 0) process.exit(1);
  });

// ─── import ───────────────────────────────────────────────────────────────────

program
  .command('import [source-dir]')
  .description('Import agent-native files from a project directory into .agentconfig/.')
  .option('--from <agent>', 'Import only from a specific agent', (v, p: string[]) => [...p, v], [] as string[])
  .option('--overwrite', 'Overwrite existing .agentconfig/ files', false)
  .option('--dry-run', 'Preview what would be written', false)
  .action(async (sourceArg: string | undefined, cmdOpts: Record<string, unknown>, cmd) => {
    const opts = cmd.optsWithGlobals<{
      config?: string;
      verbose: boolean;
      format: string;
      from: string[];
      overwrite: boolean;
      dryRun: boolean;
    }>();

    const sourceDir = sourceArg ? path.resolve(sourceArg) : process.cwd();
    if (!fs.existsSync(sourceDir)) die(`Source directory not found: ${sourceDir}`);

    const detected = detectAgents(sourceDir);
    if (detected.length === 0) {
      console.log(chalk.yellow('No agent-native files detected in ' + sourceDir));
      process.exit(0);
    }

    if (opts.verbose) {
      console.log(
        chalk.gray(
          'Detected agents: ' +
            detected.map((a) => `${a.name} (${a.confidence})`).join(', '),
        ),
      );
    }

    const ir = await importArtifacts(sourceDir, {
      from: opts.from.length > 0 ? opts.from : undefined,
    });

    // Determine target configDir (create .agentconfig/ beside source)
    const configDir = path.join(sourceDir, '.agentconfig');
    if (fs.existsSync(configDir) && !opts.overwrite && !opts.dryRun) {
      die(
        `.agentconfig/ already exists at ${configDir}. Use --overwrite to replace or --dry-run to preview.`,
      );
    }

    // Build a minimal config for the write
    const targetNames = detected.map((a) => a.name);
    const config = {
      version: 1 as const,
      targets: targetNames,
      options: { overwrite: opts.overwrite, output_dir: '.' },
    };

    await writeAgentConfigDir(ir, config, configDir, {
      overwrite: opts.overwrite,
      dryRun: opts.dryRun,
    });

    const instrCount = ir.instructions.length;
    const agentCount = ir.agents.length;
    const summary = `Imported ${instrCount} instruction(s), ${agentCount} agent(s)`;

    if (opts.dryRun) {
      console.log(chalk.cyan(`(dry run) ${summary} → ${configDir}`));
    } else {
      console.log(chalk.green(`${summary} → ${configDir}`));
    }
  });

// ─── list-targets ─────────────────────────────────────────────────────────────

program
  .command('list-targets')
  .description('List all registered generator targets.')
  .action(async (cmdOpts, cmd) => {
    const opts = cmd.optsWithGlobals<{ format: string }>();

    // Load plugins if a config is available
    const configDir = findConfigDir(process.cwd());
    if (configDir) {
      const config = await loadConfig(configDir).catch(() => null);
      if (config) await loadPlugins(config);
    }

    const targets = registry.list();

    if (opts.format === 'json') {
      console.log(JSON.stringify(targets, null, 2));
      return;
    }

    for (const t of targets) {
      console.log(`  ${chalk.cyan(t.target.padEnd(20))} ${t.displayName}`);
    }
  });

// ─── Parse & run ─────────────────────────────────────────────────────────────

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red('fatal:'), err instanceof Error ? err.message : err);
  process.exit(1);
});
