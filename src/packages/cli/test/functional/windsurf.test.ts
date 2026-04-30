import { defineCliTargetSuite } from './cli-target-suite';

defineCliTargetSuite({
  target: 'windsurf',
  generate: {
    expectedFileCount: 6,
    checks: [
      { path: '.windsurf/rules/always-rule.md', contains: ['trigger: always_on'] },
      { path: '.windsurf/rules/scoped-rule.md', contains: ['trigger: glob'] },
      { path: '.windsurf/rules/ai-rule.md', contains: ['trigger: model_decision'] },
      { path: '.windsurf/rules/migration-guide.md', contains: ['trigger: manual'] },
      { path: '.windsurf/workflows/deploy.md', contains: ['Use the staged deployment workflow.'] },
      { path: '.agents/skills/review-skill/SKILL.md', contains: ['# Review skill'] },
    ],
  },
  initialize: {
    expectedSummary: 'Initialized 4 instruction(s), 0 agent(s)',
    checks: [
      { path: '.agentconfig/config.yaml', contains: ['- windsurf'] },
      { path: '.agentconfig/instructions/always-rule.md', contains: ['activation: always'] },
      { path: '.agentconfig/instructions/scoped-rule.md', contains: ['activation: scoped'] },
      { path: '.agentconfig/instructions/ai-rule.md', contains: ['activation: ai-decided'] },
      { path: '.agentconfig/instructions/manual-rule.md', contains: ['activation: manual'] },
    ],
  },
});