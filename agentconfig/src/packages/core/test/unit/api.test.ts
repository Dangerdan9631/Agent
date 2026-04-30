import { describe, expect, it } from 'vitest';
import { generate } from '../../src/index';
import type { AgentConfig } from '../../src/types/config';
import type { IR } from '../../src/types/ir';

const config: AgentConfig = {
  version: 1,
  targets: ['copilot'],
  options: {
    overwrite: true,
    output_dir: '.',
  },
};

function createIr(overrides: Partial<IR>): IR {
  return {
    instructions: [],
    agents: [],
    skills: [],
    commands: [],
    hooks: [],
    extensions: {},
    ...overrides,
  };
}

describe('generate', () => {
  it('emits always instructions to the copilot instructions file', () => {
    const outputs = generate(
      createIr({
        instructions: [
          {
            name: 'always-rule',
            sourcePath: '/virtual/always-rule.md',
            activation: 'always',
            slug: 'always-rule',
            body: 'Always use const.',
          },
        ],
      }),
      config,
    );

    expect(outputs).toContainEqual({
      path: '.github/copilot-instructions.md',
      content: 'Always use const.',
    });
  });

  it('emits manual instructions as prompt files', () => {
    const outputs = generate(
      createIr({
        instructions: [
          {
            name: 'manual-rule',
            sourcePath: '/virtual/manual-rule.md',
            activation: 'manual',
            slug: 'manual-rule',
            body: 'Run the migration checklist.',
          },
        ],
      }),
      config,
    );

    expect(outputs).toContainEqual({
      path: '.github/prompts/manual-rule.prompt.md',
      content: 'Run the migration checklist.',
    });
  });

  it('emits commands as prompt files', () => {
    const outputs = generate(
      createIr({
        commands: [
          {
            name: 'deploy',
            slug: 'deploy',
            sourcePath: '/virtual/deploy.md',
            body: 'Deploy safely.',
          },
        ],
      }),
      config,
    );

    expect(outputs).toContainEqual({
      path: '.github/prompts/deploy.prompt.md',
      content: 'Deploy safely.',
    });
  });

  it('emits scoped instructions with applyTo frontmatter', () => {
    const outputs = generate(
      createIr({
        instructions: [
          {
            name: 'scoped-rule',
            sourcePath: '/virtual/scoped-rule.md',
            activation: 'scoped',
            slug: 'scoped-rule',
            globs: ['src/**/*.ts', 'src/**/*.tsx'],
            body: 'Use strict type narrowing.',
          },
        ],
      }),
      config,
    );

    expect(outputs).toContainEqual({
      path: '.github/instructions/scoped-rule.instructions.md',
      content: ['---', 'applyTo: "src/**/*.ts, src/**/*.tsx"', '---', '', 'Use strict type narrowing.'].join('\n'),
    });
  });

  it('emits ai-decided instructions with an in-text condition', () => {
    const outputs = generate(
      createIr({
        instructions: [
          {
            name: 'perf-rule',
            sourcePath: '/virtual/perf-rule.md',
            activation: 'ai-decided',
            slug: 'perf-rule',
            description: 'working on hot paths',
            body: 'Measure before optimizing.',
          },
        ],
      }),
      config,
    );

    expect(outputs).toContainEqual({
      path: '.github/instructions/perf-rule.instructions.md',
      content: [
        '---',
        'applyTo: "**/*"',
        '---',
        '',
        '> **Apply only when:** working on hot paths',
        '',
        'Measure before optimizing.',
      ].join('\n'),
    });
  });

  it('passes skill files through to the shared skills directory', () => {
    const outputs = generate(
      createIr({
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
      }),
      config,
    );

    expect(outputs).toContainEqual({
      path: '.agents/skills/review-skill/SKILL.md',
      content: '# Review skill',
    });
  });
});