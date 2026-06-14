import path from 'node:path';

import fse from 'fs-extra';
import { Command } from 'commander';

import {
  GLOBAL_MANIFESTO_RELATIVE_PATH,
  readGlobalManifesto,
  readStepManifesto,
  stepManifestoDir,
} from '../../manifesto/index.js';

/**
 * One manifesto entry returned by the read-only `manifesto show` command.
 */
export interface ManifestoShowEntry {
  /**
   * Whether the entry is project-global or scoped to a workflow step.
   */
  scope: 'global' | 'step';
  /**
   * Workflow step id when `scope` is `step`.
   */
  stepId?: string;
  /**
   * Project-relative path to the manifesto file.
   */
  path: string;
  /**
   * Raw markdown body when the file exists; null when absent.
   */
  content: string | null;
}

/**
 * Loads manifesto content for the `manifesto show` CLI command.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param options - Scope selector flags from the CLI invocation.
 * @returns Manifesto entries matching the requested scope.
 */
export async function loadManifestoShowEntries(
  projectRoot: string,
  options: { global?: boolean; step?: string },
): Promise<ManifestoShowEntry[]> {
  if (options.global === true) {
    return [
      {
        scope: 'global',
        path: GLOBAL_MANIFESTO_RELATIVE_PATH,
        content: await readGlobalManifesto(projectRoot),
      },
    ];
  }

  if (options.step != null) {
    return [
      {
        scope: 'step',
        stepId: options.step,
        path: path.posix.join('.spec-n-roll/config/manifesto/steps', `${options.step}.md`),
        content: await readStepManifesto(projectRoot, options.step),
      },
    ];
  }

  const entries: ManifestoShowEntry[] = [
    {
      scope: 'global',
      path: GLOBAL_MANIFESTO_RELATIVE_PATH,
      content: await readGlobalManifesto(projectRoot),
    },
  ];

  const stepsDir = stepManifestoDir(projectRoot);
  if (await fse.pathExists(stepsDir)) {
    const files = (await fse.readdir(stepsDir)).filter((entry) => entry.endsWith('.md')).sort();
    for (const fileName of files) {
      const stepId = fileName.slice(0, -'.md'.length);
      entries.push({
        scope: 'step',
        stepId,
        path: path.posix.join('.spec-n-roll/config/manifesto/steps', fileName),
        content: await readStepManifesto(projectRoot, stepId),
      });
    }
  }

  return entries;
}

/**
 * Registers the `manifesto show` subcommand on the manifesto command group.
 *
 * @param manifesto - Commander `manifesto` command to attach the subcommand to.
 */
export function registerManifestoShowCommand(manifesto: Command): void {
  manifesto
    .command('show')
    .description('Read Spec Manifesto content as JSON for debugging')
    .option('--global', 'Show only the global manifesto')
    .option('--step <stepId>', 'Show only the manifesto for one workflow step')
    .action(async (options: { global?: boolean; step?: string }) => {
      if (options.global === true && options.step != null) {
        console.error('Use either --global or --step, not both.');
        process.exit(1);
      }

      const entries = await loadManifestoShowEntries(process.cwd(), options);
      console.log(JSON.stringify({ manifestos: entries }, null, 2));
    });
}

/**
 * Registers the `manifesto` command group on the root Commander program.
 *
 * @param program - Root Commander program to attach commands to.
 */
export function registerManifestoCommand(program: Command): void {
  const manifesto = program
    .command('manifesto')
    .description('Read-only Spec Manifesto operations');

  registerManifestoShowCommand(manifesto);
}
