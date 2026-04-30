import { defineCliTargetSuite } from './cli-target-suite';

defineCliTargetSuite({
  target: 'gemini-cli',
  generate: {
    expectedFileCount: 5,
    checks: [
      { path: 'GEMINI.md', contains: ['Always keep changes reviewable.', '> **Apply only when:** working on performance-sensitive code'] },
      { path: '.gemini/instructions/migration-guide.md', contains: ['Follow the migration guide carefully.'] },
      { path: '.gemini/skills/deploy/SKILL.md', contains: ['disable-model-invocation: true'] },
      { path: '.gemini/skills/review-skill/SKILL.md', contains: ['# Review skill'] },
      { path: '.gemini/settings.json', contains: ['"BeforeTool"', '30000'] },
    ],
  },
  initialize: {
    expectedSummary: 'Initialized 2 instruction(s), 0 agent(s)',
    checks: [
      { path: '.agentconfig/config.yaml', contains: ['- gemini-cli'] },
      { path: '.agentconfig/instructions/gemini.md', contains: ['activation: always'] },
      { path: '.agentconfig/instructions/migrate.md', contains: ['activation: manual'] },
    ],
  },
});