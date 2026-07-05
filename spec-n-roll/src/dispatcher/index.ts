#!/usr/bin/env node

import { Command } from 'commander';

import { isProjectRoot, resolveProjectRoot } from './project-resolver.js';
import { executeCli } from './cli-executor.js';

/**
 * Commander option values recognized by the dispatcher parser.
 */
interface DispatcherOptions {
    /**
     * True when the caller requested global runtime routing.
     */
    global?: boolean;

    /**
     * Project root path exactly as provided by argv.
     */
    root?: string;
}

export function dispatch() {
    new Command()
        .name("Spec N' Roll")
        .option('--global', 'Run the global CLI instead of a project-local instance')
        .option('--root <path>', 'Specifies a project root directory to work from')
        .allowUnknownOption()
        .allowExcessArguments()
        .action((options: DispatcherOptions) => {
            const localProjectRoot = (!options.global && options.root)
                ? isProjectRoot(options.root)
                    ? options.root
                    : undefined
                : resolveProjectRoot(process.cwd());

            const dispatchArgs = process.argv.slice(2)
            const execOptions = localProjectRoot
                ? {
                    localProjectRoot: localProjectRoot,
                    args: dispatchArgs,
                    cwd: localProjectRoot,
                }
                : {
                    args: dispatchArgs,
                    cwd: process.cwd(),
                };

            executeCli(execOptions);
        }).parse();
}

dispatch();
