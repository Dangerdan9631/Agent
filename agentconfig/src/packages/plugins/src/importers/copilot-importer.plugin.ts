import * as fs from 'node:fs';
import * as path from 'node:path';
import { safeMatter as matter } from '../utils';
import fg from 'fast-glob';
import type { ImporterPlugin, ValidationResult, DetectedAgent } from 'agentconfig-api';
import { InstructionFile } from '../directive-types';

export function detect(dir: string): DetectedAgent[] {
  const result: DetectedAgent[] = [];
  if (
    fs.existsSync(path.join(dir, '.github', 'copilot-instructions.md')) ||
    fs.existsSync(path.join(dir, '.github', 'instructions'))
  ) {
    result.push({ name: 'copilot', confidence: 'high' });
  }
  if (
    fs.existsSync(path.join(dir, '.github', 'CopilotCLI-instructions.md'))
  ) {
    result.push({ name: 'copilot-cli', confidence: 'high' });
  }
  return result;
}

const IN_TEXT_PREFIX = '> **Apply only when:**';

function isAiDecidedBody(body: string): boolean {
  return body.trimStart().startsWith(IN_TEXT_PREFIX);
}

function extractDescriptionFromBody(body: string): string {
  const line = body.trimStart().split('\n')[0] ?? '';
  return line.replace(/^>\s*\*\*Apply only when:\*\*\s*/, '').trim();
}

function stripInTextCondition(body: string): string {
  const lines = body.trimStart().split('\n');
  return lines.slice(2).join('\n').trimStart();
}

export class CopilotInstructionImporter implements ImporterPlugin<InstructionFile> {
  readonly agent = ['copilot', 'copilot-cli'];
  readonly instructionType = 'instruction';

  validate(_projectRoot: string): ValidationResult[] {
    return [];
  }

  async import(projectRoot: string): Promise<InstructionFile[]> {
    const instructions: InstructionFile[] = [];

    // Always: repository-wide instructions
    const globalFiles = [
      path.join(projectRoot, '.github', 'copilot-instructions.md'),
      path.join(projectRoot, '.github', 'CopilotCLI-instructions.md'),
    ];
    
    for (const globalFile of globalFiles) {
      if (fs.existsSync(globalFile)) {
        const body = fs.readFileSync(globalFile, 'utf8').trim();
        if (body) {
          instructions.push(new InstructionFile(
            path.basename(globalFile, '.md'),
            globalFile,
            'always',
            body,
            path.basename(globalFile, '.md'),
          ));
        }
      }
    }

    // Path-specific instructions
    const instrDir = path.join(projectRoot, '.github', 'instructions');
    if (fs.existsSync(instrDir)) {
      const files = await fg('**/*.instructions.md', { cwd: instrDir, absolute: true });
      for (const filePath of files.sort()) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const { data, content, parseWarning } = matter(raw);
        const body = content.trim();
        const stem = path.basename(filePath, '.instructions.md');

        const applyTo = typeof data.applyTo === 'string' ? data.applyTo : '**/*';

        if (applyTo === '**/*') {
          if (isAiDecidedBody(body)) {
            const description = extractDescriptionFromBody(body);
            const cleanBody = stripInTextCondition(body);
            instructions.push(new InstructionFile(
              stem,
              filePath,
              'ai-decided',
              cleanBody,
              stem,
              undefined,
              description,
              undefined,
              undefined,
              'activation inferred from applyTo: **/* + in-text condition'
            ));
          } else {
            instructions.push(new InstructionFile(
              stem,
              filePath,
              'always',
              body,
              stem,
              undefined,
              undefined,
              undefined,
              undefined,
              parseWarning ?? 'activation inferred from applyTo: **/*; verify if scoped was intended'
            ));
          }
        } else {
          const globs = applyTo.split(',').map((g: string) => g.trim()).filter(Boolean);
          instructions.push(new InstructionFile(
            stem,
            filePath,
            'scoped',
            body,
            stem,
            globs,
          ));
        }
      }
    }

    // Manual: prompt files
    const promptsDir = path.join(projectRoot, '.github', 'prompts');
    if (fs.existsSync(promptsDir)) {
      const files = await fg('**/*.prompt.md', { cwd: promptsDir, absolute: true });
      for (const filePath of files.sort()) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const { content } = matter(raw);
        const stem = path.basename(filePath, '.prompt.md');
        instructions.push(new InstructionFile(
          stem,
          filePath,
          'manual',
          content.trim(),
          stem,
        ));
      }
    }

    return instructions;
  }
}

export default [
  new CopilotInstructionImporter(),
];
