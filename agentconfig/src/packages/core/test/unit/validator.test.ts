import { describe, expect, it } from 'vitest';
import { validate } from '../../src/validator';
import type { AgentConfig } from '../../src/types/config';
import type { IR, InstructionFile } from '../../src/types/ir';

function createInstruction(overrides: Partial<InstructionFile>): InstructionFile {
  return {
    name: 'rule',
    sourcePath: '/virtual/rule.md',
    activation: 'always',
    slug: 'rule',
    body: 'Body',
    ...overrides,
  };
}

function createIr(instructions: InstructionFile[]): IR {
  return {
    instructions,
    agents: [],
    skills: [],
    commands: [],
    hooks: [],
    extensions: {},
  };
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
  it('reports an error when scoped instructions have no globs', () => {
    const results = validate(
      createIr([createInstruction({ activation: 'scoped', globs: [] })]),
      createConfig(['copilot']),
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
      createIr([
        createInstruction({
          name: 'ai-rule',
          sourcePath: '/virtual/ai-rule.md',
          activation: 'ai-decided',
          slug: 'ai-rule',
          description: undefined,
        }),
      ]),
      createConfig(['copilot']),
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
      createIr([
        createInstruction({
          body: 'x'.repeat(12_001),
          targets: ['copilot'],
        }),
      ]),
      createConfig(['antigravity']),
    );

    expect(results).toEqual([]);
  });

  it('warns when antigravity rules exceed the file size limit', () => {
    const results = validate(
      createIr([createInstruction({ body: 'x'.repeat(12_001) })]),
      createConfig(['antigravity']),
    );

    expect(results).toContainEqual(
      expect.objectContaining({
        level: 'warning',
        message: expect.stringContaining('Antigravity rule file exceeds 12,000 character limit'),
      }),
    );
  });

  it('warns when windsurf rules exceed the file size limit', () => {
    const results = validate(
      createIr([createInstruction({ body: 'x'.repeat(12_001) })]),
      createConfig(['windsurf']),
    );

    expect(results).toContainEqual(
      expect.objectContaining({
        level: 'warning',
        message: expect.stringContaining('Windsurf rule file exceeds 12,000 character limit'),
      }),
    );
  });

  it('warns when cursor always-on rules exceed the global file size limit', () => {
    const results = validate(
      createIr([createInstruction({ body: 'x'.repeat(12_001) })]),
      createConfig(['cursor']),
    );

    expect(results).toContainEqual(
      expect.objectContaining({
        level: 'warning',
        message: expect.stringContaining('Cursor always-on rule exceeds the 6,000-character global limit'),
      }),
    );
  });

  it('reports the codex hooks feature flag reminder', () => {
    const results = validate(
      {
        instructions: [],
        agents: [],
        skills: [],
        commands: [],
        hooks: [
          {
            name: 'block-force-push',
            event: 'PreToolUse',
            type: 'command',
            command: './hooks/block-force-push.sh',
          },
        ],
        extensions: {},
      },
      createConfig(['codex']),
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
      {
        instructions: [],
        agents: [],
        skills: [],
        commands: [],
        hooks: [
          {
            name: 'block-force-push',
            event: 'PreToolUse',
            type: 'command',
            command: './hooks/block-force-push.sh',
          },
        ],
        extensions: {},
      },
      createConfig(['codex']),
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
    const results = validate(createIr([]), createConfig(['claude-code', 'codex']));

    expect(results).toContainEqual(
      expect.objectContaining({
        level: 'warning',
        message: expect.stringContaining('Both claude-code and codex targets are active'),
      }),
    );
  });
});
