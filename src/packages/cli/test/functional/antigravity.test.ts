import { defineCliTargetSuite } from './cli-target-suite';

defineCliTargetSuite({
  target: 'antigravity',
  generate: {
    expectedFileCount: 6,
    checks: [
      { path: '.agents/rules/always-rule.md', contains: ['activation: always'] },
      { path: '.agents/rules/scoped-rule.md', contains: ['activation: glob', 'glob: "src/**/*.ts"'] },
      { path: '.agents/rules/ai-rule.md', contains: ['activation: model', 'description: working on performance-sensitive code'] },
      { path: '.agents/rules/migration-guide.md', contains: ['activation: manual'] },
      { path: '.agents/workflows/deploy.md', contains: ['Use the staged deployment workflow.'] },
      { path: '.agents/skills/review-skill/SKILL.md', contains: ['# Review skill'] },
    ],
  },
  initialize: {
    expectedSummary: 'Initialized 4 instruction(s), 0 agent(s)',
    checks: [
      { path: '.agentconfig/config.yaml', contains: ['- antigravity'] },
      { path: '.agentconfig/instructions/always-rule.md', contains: ['activation: always'] },
      { path: '.agentconfig/instructions/scoped-rule.md', contains: ['activation: scoped'] },
      { path: '.agentconfig/instructions/ai-rule.md', contains: ['activation: ai-decided'] },
      { path: '.agentconfig/instructions/manual-rule.md', contains: ['activation: manual'] },
    ],
  },
});