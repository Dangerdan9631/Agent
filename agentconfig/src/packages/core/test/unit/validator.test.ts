import { describe, expect, it } from 'vitest';
import { validate } from '../../src/validator';
import type { AgentConfig } from 'agentconfig-api';
import { registerAll, HookDefinition, InstructionFile } from '../../../plugins/src';
import { PluginRegistry } from '../../src/infrastructure/plugin-registry';

function createInstruction(overrides: Partial<InstructionFile>): InstructionFile {
  return new InstructionFile(
    overrides.name ?? 'rule',
    overrides.sourcePath ?? '/virtual/rule.md',
    overrides.activation ?? 'always',
    overrides.body ?? 'Body',
    overrides.slug ?? 'rule',
    overrides.globs,
    overrides.description,
    overrides.targets,
    overrides.excludedTargets,
    overrides.importNote,
  );
}

function createConfig(targets: string[]): AgentConfig {
  return {
    version: 1,
    targets,
    options: {
      output_dir: '.',
    },
  };
}

describe('validate', () => {
  const registry = new PluginRegistry();
  registerAll(registry);

  it('reports an error when scoped instructions have no globs', () => {
    const results = validate(
      [createInstruction({ activation: 'scoped', globs: [] })],
      createConfig(['copilot']),
      registry,
    );

    expect(results).toContainEqual(
      expect.objectContaining({
        level: 'error',
        message: '"globs" is required when activation is "scoped".',
      }),
    );
  });

  it('reports an error when ai-decided instructions have no description', () => {
    const results = validate(
      [
        createInstruction({
          name: 'ai-rule',
          sourcePath: '/virtual/ai-rule.md',
          activation: 'ai-decided',
          slug: 'ai-rule',
          description: undefined,
        }),
      ],
      createConfig(['copilot']),
      registry,
    );

    expect(results).toContainEqual(
      expect.objectContaining({
        level: 'error',
        message: '"description" is required when activation is "ai-decided".',
      }),
    );
  });

  it('skips target-specific warnings when the instruction is filtered out', () => {
    const results = validate(
      [
        createInstruction({
          body: 'x'.repeat(12_001),
          targets: ['copilot'],
        }),
      ],
      createConfig(['antigravity']),
      registry,
    );

    expect(results).toEqual([]);
  });

  it('warns when antigravity rules exceed the file size limit', () => {
    const results = validate([createInstruction({ body: 'x'.repeat(12_001) })], createConfig(['antigravity']), registry);

    expect(results).toContainEqual(
      expect.objectContaining({
        level: 'warning',
        message: expect.stringContaining('Antigravity rule file exceeds 12,000 character limit'),
      }),
    );
  });

  it('warns when windsurf rules exceed the file size limit', () => {
    const results = validate([createInstruction({ body: 'x'.repeat(12_001) })], createConfig(['windsurf']), registry);

    expect(results).toContainEqual(
      expect.objectContaining({
        level: 'warning',
        message: expect.stringContaining('Windsurf rule file exceeds 12,000 character limit'),
      }),
    );
  });

  it('warns when cursor always-on rules exceed the global file size limit', () => {
    const results = validate([createInstruction({ body: 'x'.repeat(12_001) })], createConfig(['cursor']), registry);

    expect(results).toContainEqual(
      expect.objectContaining({
        level: 'warning',
        message: expect.stringContaining('Cursor always-on rule exceeds the 6,000-character global limit'),
      }),
    );
  });

  it('reports the codex hooks feature flag reminder', () => {
    const results = validate(
      [new HookDefinition('block-force-push', 'PreToolUse', 'command', undefined, './hooks/block-force-push.sh')],
      createConfig(['codex']),
      registry,
    );

    expect(results).toContainEqual(
      expect.objectContaining({
        level: 'info',
        message: expect.stringContaining('Codex hooks require `codex_hooks = true`'),
      }),
    );
  });

  it('warns about codex hooks on Windows', () => {
    const results = validate(
      [new HookDefinition('block-force-push', 'PreToolUse', 'command', undefined, './hooks/block-force-push.sh')],
      createConfig(['codex']),
      registry,
    );

    if (process.platform === 'win32') {
      expect(results).toContainEqual(
        expect.objectContaining({
          level: 'warning',
          message: expect.stringContaining('Codex hooks are disabled on Windows'),
        }),
      );
      return;
    }

    expect(results).not.toContainEqual(
      expect.objectContaining({
        level: 'warning',
        message: expect.stringContaining('Codex hooks are disabled on Windows'),
      }),
    );
  });

  it('warns when claude-code and codex are both targeted', () => {
    const results = validate([], createConfig(['claude-code', 'codex']), registry);

    expect(results).toContainEqual(
      expect.objectContaining({
        level: 'warning',
        message: expect.stringContaining('Both claude-code and codex targets are active'),
      }),
    );
  });
});
