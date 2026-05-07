import { spawn } from 'node:child_process';

export type Difficulty = 'low' | 'medium' | 'high';
export type ThinkingLevel = 'none' | 'low' | 'medium' | 'high';

export interface LlmModel {
  name: string;
  difficulty: Difficulty;
  thinking: ThinkingLevel;
}

export interface LlmPrompt {
  prompt: string;
  context: string;
  difficulty: Difficulty;
  thinking: ThinkingLevel;
}

export interface LlmProvider {
  readonly providerName: string;
  readonly models: LlmModel[];
  runPrompt(model: LlmModel, prompt: LlmPrompt): Promise<string>;
}

export interface CliCommand {
  command: string;
  args: string[];
}

export function formatPrompt(prompt: LlmPrompt): string {
  const context = prompt.context.trim();
  if (!context) {
    return prompt.prompt;
  }

  return `Context:\n${context}\n\nPrompt:\n${prompt.prompt}`;
}

export function runCliPrompt(providerName: string, command: CliCommand, input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command.command, command.args, {
      shell: process.platform === 'win32',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const stdout: string[] = [];
    const stderr: string[] = [];

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => stdout.push(chunk));
    child.stderr.on('data', (chunk: string) => stderr.push(chunk));

    child.once('error', (error) => {
      reject(new Error(`${providerName} failed to start: ${error.message}`));
    });

    child.once('close', (code) => {
      const output = stdout.join('').trim();
      const errorOutput = stderr.join('').trim();
      const combinedOutput = [output, errorOutput].filter(Boolean).join('\n');

      if (isQuotaError(combinedOutput)) {
        reject(new Error(`${providerName} quota or rate limit reached.`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${providerName} exited with code ${code}: ${errorOutput || output || 'no output'}`));
        return;
      }

      resolve(output);
    });

    child.stdin.end(input);
  });
}

function isQuotaError(output: string): boolean {
  return /\b(quota|rate limit|rate-limit|too many requests|usage limit|insufficient_quota)\b/i.test(output);
}
