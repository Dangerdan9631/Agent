import { spawn } from 'node:child_process';
import type { CliCommand } from './llm-provider.js';

const DEFAULT_PROCESS_TIMEOUT_MS = 300_000;

export function runCliPrompt(
  providerName: string,
  command: CliCommand,
  input: string,
  signal?: AbortSignal,
  timeoutMs = DEFAULT_PROCESS_TIMEOUT_MS,
): Promise<string> {
  if (signal?.aborted) {
    return Promise.reject(new Error(`${providerName} request aborted.`));
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command.command, command.args, {
      shell: process.platform === 'win32',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let settled = false;
    const stdout: string[] = [];
    const stderr: string[] = [];

    const finish = (error?: Error, output?: string) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutHandle);
      signal?.removeEventListener('abort', abortListener);

      if (error) {
        reject(error);
        return;
      }

      resolve(output ?? '');
    };

    const abortListener = () => {
      child.kill();
      finish(new Error(`${providerName} request aborted.`));
    };

    const timeoutHandle = setTimeout(() => {
      child.kill();
      finish(new Error(`${providerName} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => stdout.push(chunk));
    child.stderr.on('data', (chunk: string) => stderr.push(chunk));

    child.once('error', (error) => {
      finish(new Error(`${providerName} failed to start: ${error.message}`));
    });

    child.once('close', (code) => {
      const output = stdout.join('').trim();
      const errorOutput = stderr.join('').trim();
      const combinedOutput = [output, errorOutput].filter(Boolean).join('\n');

      if (isQuotaError(combinedOutput)) {
        finish(new Error(`${providerName} quota or rate limit reached.`));
        return;
      }

      if (code !== 0) {
        finish(new Error(`${providerName} exited with code ${code}: ${errorOutput || output || 'no output'}`));
        return;
      }

      finish(undefined, output);
    });

    signal?.addEventListener('abort', abortListener, { once: true });
    child.stdin.end(input);
  });
}

function isQuotaError(output: string): boolean {
  return /\b(quota|rate limit|rate-limit|too many requests|usage limit|insufficient_quota)\b/i.test(output);
}
