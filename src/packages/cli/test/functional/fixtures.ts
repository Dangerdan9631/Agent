import { writeTree } from '../test-utils';

function configYaml(target: string): string {
  return [
    'version: 1',
    'targets:',
    `  - ${target}`,
    'options:',
    '  overwrite: true',
    '  output_dir: generated',
    '',
  ].join('\n');
}

export function writeGeneratorFixture(projectDir: string, target: string): void {
  writeTree(projectDir, {
    '.agentconfig/config.yaml': configYaml(target),
    '.agentconfig/instructions/always-rule.md': 'Always keep changes reviewable.\n',
    '.agentconfig/instructions/scoped-rule.md': [
      '---',
      'activation: scoped',
      'globs:',
      '  - "src/**/*.ts"',
      '  - "src/**/*.tsx"',
      '---',
      '',
      'Use strict TypeScript types.',
      '',
    ].join('\n'),
    '.agentconfig/instructions/ai-rule.md': [
      '---',
      'activation: ai-decided',
      'description: working on performance-sensitive code',
      '---',
      '',
      'Profile before optimizing.',
      '',
    ].join('\n'),
    '.agentconfig/instructions/manual-rule.md': [
      '---',
      'activation: manual',
      'name: migration-guide',
      '---',
      '',
      'Follow the migration guide carefully.',
      '',
    ].join('\n'),
    '.agentconfig/agents/security-reviewer.md': [
      '---',
      'name: security-reviewer',
      'description: Reviews security vulnerabilities',
      'model: claude-sonnet-4-6',
      'tools:',
      '  - Read',
      '  - Grep',
      'targets:',
      '  - claude-code',
      '  - codex',
      'isolation: worktree',
      'sandbox_mode: read-only',
      'reasoning_effort: high',
      '---',
      '',
      'Review for vulnerabilities.',
      '',
    ].join('\n'),
    '.agentconfig/commands/deploy.md': 'Use the staged deployment workflow.\n',
    '.agentconfig/skills/review-skill/SKILL.md': '# Review skill\n',
    '.agentconfig/hooks/hooks.yaml': [
      'hooks:',
      '  - name: block-force-push',
      '    event: PreToolUse',
      '    matcher: Bash',
      '    type: command',
      '    command: ./hooks/scripts/block-force-push.sh',
      '    timeout: 30',
      '    blocking: true',
      '    async: false',
      '    targets:',
      '      - cursor',
      '      - claude-code',
      '      - gemini-cli',
      '      - codex',
      '      - cline',
      '',
    ].join('\n'),
  });
}

export function writeNativeFixture(projectDir: string, target: string): void {
  switch (target) {
    case 'copilot':
    case 'copilot-cli':
      writeTree(projectDir, {
        '.github/copilot-instructions.md': 'Always review security-sensitive changes.\n',
        '.github/instructions/scoped.instructions.md': [
          '---',
          'applyTo: "src/**/*.ts, src/**/*.tsx"',
          '---',
          '',
          'Use narrow TypeScript types.',
          '',
        ].join('\n'),
        '.github/instructions/ai.instructions.md': [
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
      return;
    case 'cursor':
      writeTree(projectDir, {
        '.cursor/rules/always-rule.mdc': ['---', 'alwaysApply: true', '---', '', 'Always use const.', ''].join('\n'),
        '.cursor/rules/scoped-rule.mdc': [
          '---',
          'globs: "src/**/*.ts, src/**/*.tsx"',
          'alwaysApply: false',
          '---',
          '',
          'Use typed APIs.',
          '',
        ].join('\n'),
        '.cursor/rules/ai-rule.mdc': [
          '---',
          'description: working on performance-sensitive code',
          'alwaysApply: false',
          '---',
          '',
          'Profile first.',
          '',
        ].join('\n'),
        '.cursor/rules/manual-rule.mdc': 'Manual invocation only.\n',
      });
      return;
    case 'claude-code':
      writeTree(projectDir, {
        '.claude/CLAUDE.md': 'Always review risky changes.\n',
        '.claude/rules/scoped-rule.md': [
          '---',
          'paths:',
          '  - src/**/*.ts',
          '---',
          '',
          'Use typed APIs.',
          '',
        ].join('\n'),
        '.claude/rules/ai-rule.md': [
          '> **Apply only when:** working on performance-sensitive code',
          '',
          'Profile first.',
          '',
        ].join('\n'),
        '.claude/rules/manual-rule.md': [
          '---',
          'paths: []',
          '---',
          '',
          'Manual invocation only.',
          '',
        ].join('\n'),
        '.claude/agents/security-reviewer.md': [
          '---',
          'name: security-reviewer',
          'description: Reviews security vulnerabilities',
          'model: claude-sonnet-4-6',
          'tools:',
          '  - Read',
          'targets:',
          '  - claude-code',
          '---',
          '',
          'Review for vulnerabilities.',
          '',
        ].join('\n'),
      });
      return;
    case 'gemini-cli':
      writeTree(projectDir, {
        'GEMINI.md': 'Always review risky changes.\n',
        '.gemini/instructions/migrate.md': 'Run the migration plan.\n',
      });
      return;
    case 'antigravity':
      writeTree(projectDir, {
        '.agents/rules/always-rule.md': ['---', 'activation: always', '---', '', 'Always use const.', ''].join('\n'),
        '.agents/rules/scoped-rule.md': [
          '---',
          'activation: glob',
          'glob: "src/**/*.ts"',
          '---',
          '',
          'Use typed APIs.',
          '',
        ].join('\n'),
        '.agents/rules/ai-rule.md': [
          '---',
          'activation: model',
          'description: working on performance-sensitive code',
          '---',
          '',
          'Profile first.',
          '',
        ].join('\n'),
        '.agents/rules/manual-rule.md': [
          '---',
          'activation: manual',
          '---',
          '',
          'Manual invocation only.',
          '',
        ].join('\n'),
      });
      return;
    case 'codex':
      writeTree(projectDir, {
        'AGENTS.md': 'Always review risky changes.\n',
        '.codex/instructions/migrate.md': 'Run the migration plan.\n',
        '.codex/agents/security-reviewer.toml': [
          'name = "security-reviewer"',
          'description = "Reviews security vulnerabilities"',
          'model = "claude-sonnet-4-6"',
          'model_reasoning_effort = "high"',
          'sandbox_mode = "read-only"',
          '',
          'developer_instructions = """',
          'Review for vulnerabilities.',
          '"""',
          '',
        ].join('\n'),
      });
      return;
    case 'windsurf':
      writeTree(projectDir, {
        '.windsurf/rules/always-rule.md': ['---', 'trigger: always_on', '---', '', 'Always use const.', ''].join('\n'),
        '.windsurf/rules/scoped-rule.md': [
          '---',
          'trigger: glob',
          'globs: "src/**/*.ts, src/**/*.tsx"',
          '---',
          '',
          'Use typed APIs.',
          '',
        ].join('\n'),
        '.windsurf/rules/ai-rule.md': [
          '---',
          'trigger: model_decision',
          'description: working on performance-sensitive code',
          '---',
          '',
          'Profile first.',
          '',
        ].join('\n'),
        '.windsurf/rules/manual-rule.md': [
          '---',
          'trigger: manual',
          '---',
          '',
          'Manual invocation only.',
          '',
        ].join('\n'),
      });
      return;
    case 'windsurf-cli':
      writeTree(projectDir, {
        '.devin/rules/always-rule.md': ['---', 'trigger: always_on', '---', '', 'Always use const.', ''].join('\n'),
        '.devin/rules/scoped-rule.md': [
          '---',
          'trigger: glob',
          'globs: "src/**/*.ts, src/**/*.tsx"',
          '---',
          '',
          'Use typed APIs.',
          '',
        ].join('\n'),
        '.devin/rules/ai-rule.md': [
          '---',
          'trigger: model_decision',
          'description: working on performance-sensitive code',
          '---',
          '',
          'Profile first.',
          '',
        ].join('\n'),
        '.devin/rules/manual-rule.md': [
          '---',
          'trigger: manual',
          '---',
          '',
          'Manual invocation only.',
          '',
        ].join('\n'),
      });
      return;
    case 'cline':
      writeTree(projectDir, {
        '.clinerules/always-rule.md': 'Always use const.\n',
        '.clinerules/scoped-rule.md': [
          '---',
          'paths:',
          '  - src/**/*.ts',
          '---',
          '',
          'Use typed APIs.',
          '',
        ].join('\n'),
        '.clinerules/ai-rule.md': [
          '> **Apply only when:** working on performance-sensitive code',
          '',
          'Profile first.',
          '',
        ].join('\n'),
        '.clinerules/workflows/deploy.md': 'Ignored workflow.\n',
      });
      return;
    default:
      throw new Error(`Unsupported target fixture: ${target}`);
  }
}