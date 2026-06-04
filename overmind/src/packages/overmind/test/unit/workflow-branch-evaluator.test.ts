import { describe, expect, it } from 'vitest';

import { evaluateWorkflowBranch } from '../../src/domain/workflow/workflow-branch-evaluator.js';

describe('evaluateWorkflowBranch', () => {
  it('uses AND semantics across supported condition fields and first-match precedence', () => {
    const branches = [
      {
        when: {
          outputContains: 'needs-validation',
          statusEquals: 'success',
        },
        next: 'validate',
      },
      {
        when: {
          outputContains: 'needs-validation',
        },
        next: 'fallback',
      },
    ];

    const match = evaluateWorkflowBranch(branches, {
      output: 'task needs-validation immediately',
      status: 'success',
    });

    expect(match?.next).toBe('validate');
  });

  it('supports regex matching and returns undefined when nothing matches', () => {
    expect(
      evaluateWorkflowBranch(
        [
          {
            when: {
              outputRegex: 'ticket-\\d+',
            },
            next: 'regex-hit',
          },
        ],
        {
          output: 'ticket-42 created',
          status: 'success',
        },
      )?.next,
    ).toBe('regex-hit');

    expect(
      evaluateWorkflowBranch(
        [
          {
            when: {
              outputContains: 'missing',
            },
            next: 'nope',
          },
        ],
        {
          output: 'all clear',
          status: 'success',
        },
      ),
    ).toBeUndefined();
  });
});
