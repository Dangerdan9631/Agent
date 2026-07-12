import { execFileSync, spawn, type ExecFileSyncOptions } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { FrameworkUpdateOutput, GlobalFrameworkUpdater } from '#runtime/application/update/global-framework-updater.js';

/**
 * Updates global packages through npm or rebuilds linked local source workspaces.
 */
export class NodeGlobalFrameworkUpdater implements GlobalFrameworkUpdater {
  /** Determines whether a global update is available. */
  isUpdateAvailable(installSource: 'local' | 'remote', installedVersion: string): boolean {
    return installSource === 'local' || this.compareVersions(this.latestVersion(), installedVersion) > 0;
  }

  /** Runs the selected update command while forwarding its output. */
  async update(installSource: 'local' | 'remote', installDirectory: string, output: FrameworkUpdateOutput): Promise<void> {
    if (installSource === 'local') {
      const sourceRoot = resolve(readFileSync(join(installDirectory, 'dist', '.source-package-root'), 'utf8').trim(), '..', '..');
      await this.runNpm(['run', 'build'], sourceRoot, output);
      return;
    }
    await this.runNpm(['install', '--global', 'spec-n-roll@latest'], undefined, output);
  }

  /** Reads the latest published package version. */
  private latestVersion(): string {
    return (this.runNpmSync(['view', 'spec-n-roll', 'version'], { encoding: 'utf8' }) ?? '').trim();
  }

  /** Starts npm without taking control of the terminal. */
  private runNpm(argumentsList: readonly string[], cwd: string | undefined, output: FrameworkUpdateOutput): Promise<void> {
    const command = process.platform === 'win32' ? process.env.ComSpec ?? 'cmd.exe' : 'npm';
    const args = process.platform === 'win32' ? ['/d', '/s', '/c', ['npm', ...argumentsList].join(' ')] : argumentsList;
    return new Promise((resolvePromise, reject) => {
      const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
      child.stdout.on('data', (chunk: Buffer) => output.write(chunk.toString()));
      child.stderr.on('data', (chunk: Buffer) => output.write(chunk.toString()));
      child.on('error', reject);
      child.on('close', (code) => code === 0 ? resolvePromise() : reject(new Error(`npm exited with code ${code ?? 'unknown'}.`)));
    });
  }

  /** Runs npm synchronously only for a short version lookup. */
  private runNpmSync(argumentsList: readonly string[], options: ExecFileSyncOptions): string | undefined {
    const output = process.platform === 'win32' ? execFileSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', ['npm', ...argumentsList].join(' ')], options) : execFileSync('npm', argumentsList, options);
    return output == null ? undefined : output.toString();
  }

  /** Compares semantic version numeric components. */
  private compareVersions(left: string, right: string): number {
    const parse = (value: string): readonly number[] => value.replace(/^v/, '').split('-')[0]!.split('.').map((part) => Number(part) || 0);
    const leftParts = parse(left);
    const rightParts = parse(right);
    for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) { const result = (leftParts[index] ?? 0) - (rightParts[index] ?? 0); if (result !== 0) return result; }
    return 0;
  }
}
