import { defineCliTargetSuite } from './cli-target-suite';

defineCliTargetSuite({
  target: 'claude-code',
  generate: {
    expectedFileCount: 8,
    checks: [
      { path: '.claude/CLAUDE.md', contains: ['Always keep changes reviewable.'] },
      { path: '.claude/rules/scoped-rule.md', contains: ['paths:', 'src/**/*.ts'] },
      { path: '.claude/rules/ai-rule.md', contains: ['> **Apply only when:** working on performance-sensitive code'] },
      { path: '.claude/rules/migration-guide.md', contains: ['paths: []'] },
      { path: '.claude/agents/deploy.md', contains: ['name: deploy'] },
      { path: '.claude/agents/security-reviewer.md', contains: ['isolation: worktree'] },
      { path: '.claude/settings.json', contains: ['"PreToolUse"'] },
    ],
  },
  initialize: {
    expectedSummary: 'Initialized 4 instruction(s), 1 agent(s)',
    checks: [
      { path: '.agentconfig/config.yaml', contains: ['- claude-code'] },
      { path: '.agentconfig/instructions/claude-always.md', contains: ['activation: always'] },
      { path: '.agentconfig/instructions/scoped-rule.md', contains: ['activation: scoped'] },
      { path: '.agentconfig/instructions/ai-rule.md', contains: ['activation: ai-decided'] },
      { path: '.agentconfig/instructions/manual-rule.md', contains: ['activation: manual'] },
      { path: '.agentconfig/agents/security-reviewer.md', contains: ['name: security-reviewer'] },
    ],
  },
});