#!/usr/bin/env node

import { createRequire } from 'node:module';
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
    const directoryPath = dirname(fileURLToPath(import.meta.url));
    const applicationPath = resolve(directoryPath, '..');
    const require = createRequire(import.meta.url);
    const electronPath = require('electron');
    return new Promise((resolveExitCode, reject) => {
      const child = spawn(electronPath, [applicationPath, ...process.argv.slice(2)], { stdio: 'inherit' });
      child.once('error', reject);
      child.once('exit', (code) => resolveExitCode(code ?? 1));
    });
  }
}

process.exitCode = await new AtlasElectronLauncher().run();
