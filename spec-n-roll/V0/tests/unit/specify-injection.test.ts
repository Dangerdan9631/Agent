import { describe, expect, it } from 'vitest';

import type { SpecifyStageInjection } from '../../src/sdk/config/schema.js';
import { renderSpecifyInjectionSections, STANDARD_SPEC_HEADINGS } from '../../src/sdk/specs/specify.js';

const sampleInjection: SpecifyStageInjection = {
  workflowTypeId: 'repository-onboarding',
  instructions: [
    'Describe living-spec and test work as future downstream changes.',
    'Preserve standard specify headings and quality checklist compatibility.',
  ],
  evidenceSummary: [
    {
      id: 'ev-greet-code',
      sourceType: 'code',
      sourceRef: 'src/greeting/greet.ts:greet',
      behaviorSummary: 'Returns a greeting message for a valid user name.',
      evidenceKind: 'confirmed-behavior',
      confidence: 'high',
    },
  ],
  proposedLivingSpecChanges: [
    {
      changeType: 'add',
      targetRef: 'living-specs/greeting.feature',
      reason: 'Greeting behavior is user-facing and lacks living-spec coverage.',
    },
  ],
  testGapRecommendations: [],
  testCoverageMappings: [
    {
      behaviorId: 'greeting',
      testRefs: ['tests/greeting/greet.test.ts#returns a greeting for a valid name'],
      coverageType: 'direct',
      notes: 'Executable tests assert user-observable behavior for this area.',
    },
  ],
  questions: [],
  assumptions: ['Greeting behavior is user-facing.'],
  driftFindings: [],
};

describe('specify-stage repository injection', () => {
  it('renders repository sections while preserving standard feature spec headings', () => {
    const rendered = renderSpecifyInjectionSections(sampleInjection);

    for (const heading of STANDARD_SPEC_HEADINGS) {
      if (heading === 'Feature Specification') {
        expect(rendered).not.toMatch(/^# Feature Specification$/m);
        continue;
      }

      expect(rendered).not.toMatch(new RegExp(`^## ${heading}$`, 'm'));
    }

    expect(rendered).toContain('## Repository Discovery Evidence');
    expect(rendered).toContain('## Proposed Living Spec Changes');
    expect(rendered).toContain('## Test Coverage Mapping');
    expect(rendered).toContain('## Unresolved Ambiguity');
    expect(rendered).toContain('## Assumptions and Limitations');
    expect(rendered).toContain('src/greeting/greet.ts:greet');
    expect(rendered).toContain('living-specs/greeting.feature');
    expect(rendered).toContain('(direct)');
    expect(rendered).toContain('greet.test.ts#returns a greeting for a valid name');
    expect(rendered).toMatch(/future downstream/i);
  });

  it('keeps clarify-compatible ambiguity and authority questions in the output', () => {
    const withQuestions: SpecifyStageInjection = {
      ...sampleInjection,
      questions: [
        {
          id: 'authority-greeting',
          prompt: 'Should documentation or tests be authoritative for empty-name handling?',
        },
      ],
    };

    const rendered = renderSpecifyInjectionSections(withQuestions);
    expect(rendered).toContain('## Unresolved Ambiguity');
    expect(rendered).toContain('authority-greeting');
    expect(rendered).toContain('empty-name handling');
  });
});
