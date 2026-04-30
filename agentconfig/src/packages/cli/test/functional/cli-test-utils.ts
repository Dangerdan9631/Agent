import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const functionalDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(functionalDir, '../../../../');
const cliEntry = path.join(workspaceRoot, 'packages', 'cli', 'dist', 'index.js');

let buildPromise: Promise<void> | undefined;

function sanitizeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined),
  ) as NodeJS.ProcessEnv;
}

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function ensureCliBuilt(): Promise<void> {
  buildPromise ??= new Promise((resolve, reject) => {
    const child = process.platform === 'win32'
      ? spawn('cmd.exe', ['/d', '/s', '/c', 'npm run build'], {
        cwd: workspaceRoot,
        env: sanitizeEnv({ ...process.env, FORCE_COLOR: '0' }),
        stdio: 'pipe',
        windowsHide: true,
      })
      : spawn('npm', ['run', 'build'], {
        cwd: workspaceRoot,
        env: sanitizeEnv({ ...process.env, FORCE_COLOR: '0' }),
        stdio: 'pipe',
        windowsHide: true,
      });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `Build failed with exit code ${code ?? 1}`));
    });
  });

  await buildPromise;
}

export async function runCli(
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv },
): Promise<CliResult> {
  await ensureCliBuilt();

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliEntry, ...args], {
      cwd: options?.cwd ?? workspaceRoot,
      env: sanitizeEnv({
        ...process.env,
        FORCE_COLOR: '0',
        ...options?.env,
      }),
      stdio: 'pipe',
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}