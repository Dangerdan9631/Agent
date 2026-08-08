#!/usr/bin/env node

import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

/**
 * Starts the packaged Electron application from the `atlas` command-line boundary.
 */
class AtlasElectronLauncher {
  /**
   * Spawns Electron with the application directory and user-supplied configuration arguments.
   *
   * @returns {Promise<number>} Process-compatible Electron completion status.
   */
  async run() {
    const userArguments = process.argv.slice(2);
    if (this.requestsHelp(userArguments)) {
      this.writeHelp();
      return 0;
    }

    const directoryPath = dirname(fileURLToPath(import.meta.url));
    const applicationPath = realpathSync(resolve(directoryPath, '..'));
    const require = createRequire(resolve(applicationPath, 'package.json'));
    let electronPath;
    try {
      electronPath = require('electron');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Atlas could not resolve the electron package. Install workspace dependencies with \`npm install\` before running atlas. ${message}`
      );
    }

    const foreground = userArguments.includes('--foreground');
    const electronArguments = [
      applicationPath,
      ...userArguments.filter((argument) => argument !== '--foreground')
    ];

    if (foreground) {
      return this.runForeground(electronPath, electronArguments);
    }

    return this.runDetached(electronPath, electronArguments);
  }

  /**
   * Launches Electron attached to this process so the command tracks the desktop lifetime.
   *
   * @param {string} electronPath Absolute Electron executable path.
   * @param {readonly string[]} electronArguments Application path and viewer arguments.
   * @returns {Promise<number>} Electron exit status.
   */
  runForeground(electronPath, electronArguments) {
    return new Promise((resolveExitCode, reject) => {
      const child = spawn(electronPath, electronArguments, {
        stdio: 'inherit'
      });
      child.once('error', reject);
      child.once('exit', (code) => resolveExitCode(code ?? 1));
    });
  }

  /**
   * Launches Electron independently so the atlas command can return immediately.
   *
   * @param {string} electronPath Absolute Electron executable path.
   * @param {readonly string[]} electronArguments Application path and viewer arguments.
   * @returns {Promise<number>} Zero after Electron has been spawned successfully.
   */
  runDetached(electronPath, electronArguments) {
    return new Promise((resolveExitCode, reject) => {
      const child =
        process.platform === 'win32'
          ? spawn(
              process.env.ComSpec ?? 'cmd.exe',
              ['/d', '/s', '/c', 'start', '""', `/d`, process.cwd(), electronPath, ...electronArguments],
              {
                detached: true,
                stdio: 'ignore',
                windowsHide: true
              }
            )
          : spawn(electronPath, electronArguments, {
              detached: true,
              stdio: 'ignore'
            });
      child.once('error', reject);
      child.once('spawn', () => {
        child.unref();
        resolveExitCode(0);
      });
    });
  }

  /**
   * Detects help requests that should print usage instead of launching Electron.
   *
   * @param {readonly string[]} argumentsToInspect - User arguments after the atlas command name.
   * @returns {boolean} True when the process should print help and exit.
   */
  requestsHelp(argumentsToInspect) {
    return argumentsToInspect.some((argument) => argument === '--help' || argument === '-h');
  }

  /**
   * Writes the viewer command contract to standard output.
   */
  writeHelp() {
    process.stdout.write(
      [
        'Usage: atlas [configPath] [--foreground]',
        '',
        'Open generated Atlas diagrams in the Electron desktop application.',
        '',
        'Arguments:',
        '  configPath      Path to atlas.config.json. Defaults to ./atlas.config.json.',
        '',
        'Options:',
        '  -h, --help      Show this help message and exit.',
        '  --foreground    Keep this process attached until the viewer window closes.',
        ''
      ].join('\n')
    );
  }
}

process.exitCode = await new AtlasElectronLauncher().run();
