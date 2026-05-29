import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { AgentConfig } from 'agentconfig-api';
import {
  AgentDefinition,
  CommandDefinition,
  HookDefinition,
  InstructionFile,
  SkillDefinition,
  registerAll,
} from '../../../plugins/src';
import { importFromTargets } from '../../src/application/use-cases/shared';
import { AgentConfigDirWriter } from '../../src/infrastructure/agentconfig-dir-writer';
import { PluginRegistry } from '../../src/infrastructure/plugin-registry';
import { createTempDir, readText, removeDir, writeTree } from '../test-utils';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    removeDir(tempDirs.pop() as string);
  }
});

function createItems() {
  return [
    new InstructionFile(
      'scoped-rule',
      '/virtual/scoped-rule.md',
      'scoped',
      'Use precise types.',
      'typescript-scope',
      ['src/**/*.ts'],
      'Used for TypeScript work',
      ['copilot'],
      ['cursor'],
      '# imported from source agent',
    ),
    new AgentDefinition(
      'security-reviewer',
      '/virtual/security-reviewer.md',
      'Review for vulnerabilities.',
      'Reviews security risks',
      'claude-sonnet-4-6',
      ['Read', 'Grep'],
      ['claude-code'],
      undefined,
      'worktree',
    ),
    new SkillDefinition('review-skill', '/virtual/review-skill', [
      { relativePath: 'SKILL.md', content: '# Review skill' },
    ]),
    new CommandDefinition('deploy', 'deploy', '/virtual/deploy.md', 'Deploy carefully.'),
    new HookDefinition(
      'block-force-push',
      'PreToolUse',
      'command',
      'Bash',
      './hooks/scripts/block-force-push.sh',
      30,
      true,
      false,
    ),
  ];
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
  const registry = new PluginRegistry();
  registerAll(registry);
  await new AgentConfigDirWriter(registry).write(createItems(), createConfig(), configDir, { overwrite: true });
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

    const registry = new PluginRegistry();
    registerAll(registry);
    const items = await importFromTargets(sourceDir, registry, ['copilot']);

    expect(items.filter((item) => item.typeId === 'instruction')).toHaveLength(4);
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
