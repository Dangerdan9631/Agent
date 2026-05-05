import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { importArtifacts, writeAgentConfigDir } from '../../src/index';
import type { AgentConfig } from '../../src/types/config';
import type { IR } from '../../src/types/ir';
import { createTempDir, readText, removeDir, writeTree } from '../test-utils';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    removeDir(tempDirs.pop() as string);
  }
});

function createIr(): IR {
  return {
    instructions: [
      {
        name: 'scoped-rule',
        sourcePath: '/virtual/scoped-rule.md',
        activation: 'scoped',
        globs: ['src/**/*.ts'],
        description: 'Used for TypeScript work',
        slug: 'typescript-scope',
        targets: ['copilot'],
        excludedTargets: ['cursor'],
        body: 'Use precise types.',
        importNote: '# imported from source agent',
      },
    ],
    agents: [
      {
        name: 'security-reviewer',
        sourcePath: '/virtual/security-reviewer.md',
        description: 'Reviews security risks',
        model: 'claude-sonnet-4-6',
        tools: ['Read', 'Grep'],
        targets: ['claude-code'],
        isolation: 'worktree',
        body: 'Review for vulnerabilities.',
      },
    ],
    skills: [
      {
        name: 'review-skill',
        sourcePath: '/virtual/review-skill',
        files: [
          {
            relativePath: 'SKILL.md',
            content: '# Review skill',
          },
        ],
      },
    ],
    commands: [
      {
        name: 'deploy',
        slug: 'deploy',
        sourcePath: '/virtual/deploy.md',
        body: 'Deploy carefully.',
      },
    ],
    hooks: [
      {
        name: 'block-force-push',
        event: 'PreToolUse',
        matcher: 'Bash',
        type: 'command',
        command: './hooks/scripts/block-force-push.sh',
        timeout: 30,
        blocking: true,
        async: false,
      },
    ],
    extensions: {},
  };
}

function createConfig(): AgentConfig {
  return {
    version: 1,
    targets: ['copilot'],
    options: {
      output_dir: '.',
    },
  };
}

async function writeConfigDir(configDir: string): Promise<void> {
  await writeAgentConfigDir(createIr(), createConfig(), configDir, { overwrite: true });
}

describe('importers API', () => {
  it('deduplicates imported instructions by normalized body content', async () => {
    const sourceDir = createTempDir('agentconfig-importers-source-');
    tempDirs.push(sourceDir);

    writeTree(sourceDir, {
      '.github/copilot-instructions.md': 'Shared guidance  \nKeep it tidy.   \n',
      '.github/instructions/shared.instructions.md': [
        '---',
        'applyTo: "**/*"',
        '---',
        '',
        'Shared guidance',
        'Keep it tidy.',
        '',
      ].join('\n'),
      '.github/instructions/scoped.instructions.md': [
        '---',
        'applyTo: "src/**/*.ts, src/**/*.tsx"',
        '---',
        '',
        'Use narrow TypeScript types.',
        '',
      ].join('\n'),
      '.github/instructions/perf.instructions.md': [
        '---',
        'applyTo: "**/*"',
        '---',
        '',
        '> **Apply only when:** working on performance-sensitive code',
        '',
        'Profile first.',
        '',
      ].join('\n'),
      '.github/prompts/migrate.prompt.md': 'Run the migration plan.\n',
    });

    const ir = await importArtifacts(sourceDir, { target: ['copilot'] });

    expect(ir.instructions).toHaveLength(4);
  });

  it('writes config.yaml when exporting an .agentconfig directory', async () => {
    const configDir = createTempDir('agentconfig-write-config-');
    tempDirs.push(configDir);

    await writeConfigDir(configDir);

    expect(readText(configDir, 'config.yaml')).toContain('targets:\n  - copilot');
  });

  it('writes instruction import notes when exporting an .agentconfig directory', async () => {
    const configDir = createTempDir('agentconfig-write-instructions-');
    tempDirs.push(configDir);

    await writeConfigDir(configDir);

    expect(readText(configDir, 'instructions/scoped-rule.md')).toContain('# imported from source agent');
  });

  it('writes custom instruction slugs when exporting an .agentconfig directory', async () => {
    const configDir = createTempDir('agentconfig-write-instruction-slug-');
    tempDirs.push(configDir);

    await writeConfigDir(configDir);

    expect(readText(configDir, 'instructions/scoped-rule.md')).toContain('name: typescript-scope');
  });

  it('writes agent definitions when exporting an .agentconfig directory', async () => {
    const configDir = createTempDir('agentconfig-write-agents-');
    tempDirs.push(configDir);

    await writeConfigDir(configDir);

    expect(readText(configDir, 'agents/security-reviewer.md')).toContain('model: claude-sonnet-4-6');
  });

  it('copies skill files when exporting an .agentconfig directory', async () => {
    const configDir = createTempDir('agentconfig-write-skills-');
    tempDirs.push(configDir);

    await writeConfigDir(configDir);

    expect(readText(configDir, 'skills/review-skill/SKILL.md')).toBe('# Review skill');
  });

  it('writes command files when exporting an .agentconfig directory', async () => {
    const configDir = createTempDir('agentconfig-write-commands-');
    tempDirs.push(configDir);

    await writeConfigDir(configDir);

    expect(readText(configDir, 'commands/deploy.md')).toBe('Deploy carefully.\n');
  });

  it('writes hooks.yaml when exporting an .agentconfig directory', async () => {
    const configDir = createTempDir('agentconfig-write-hooks-');
    tempDirs.push(configDir);

    await writeConfigDir(configDir);

    expect(readText(configDir, path.join('hooks', 'hooks.yaml').replace(/\\/g, '/'))).toContain('block-force-push');
  });
});
