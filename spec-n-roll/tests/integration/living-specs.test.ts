import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { parseFeatureFile, readFeatureFile } from '../../src/sdk/living-specs/gherkin.js';
import { formatSpecNRollTag } from '../../src/sdk/living-specs/tags.js';
import { runImplement } from '../../src/sdk/specs/implement.js';
import { writeWorkflowState } from '../../src/sdk/core/workflow-state.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary project root tracked for cleanup after each test.
 *
 * @param suffix - Unique suffix for the directory name.
 * @returns Absolute path to the created project root.
 */
function createProjectRoot(suffix: string): string {
  const projectRoot = path.join(os.tmpdir(), `spec-n-roll-living-${suffix}-${Date.now()}`);
  tempDirs.push(projectRoot);
  return projectRoot;
}

/**
 * Seeds a minimal task spec directory with workflow state for implement entry.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 */
async function seedTaskSpecForImplement(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
): Promise<void> {
  const specDir = path.join(projectRoot, 'specs', `${taskSpecId}-${slug}`);
  mkdirSync(specDir, { recursive: true });
  writeFileSync(path.join(specDir, 'spec.md'), `---\nstatus: Active\n---\n\n# ${slug}\n`, 'utf8');
  await writeWorkflowState(projectRoot, {
    taskSpecId,
    slug,
    workflowVariantId: 'quick',
    lastCompletedStepId: 'tasks',
    currentStepId: 'implement',
    status: 'active',
  });
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir != null) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup.
      }
    }
  }
});

describe('living spec operations', () => {
  it('creates a new feature file when none exists', async () => {
    const projectRoot = createProjectRoot('create');
    mkdirSync(path.join(projectRoot, 'living-specs'), { recursive: true });
    await seedTaskSpecForImplement(projectRoot, '001', 'oauth-login');

    const result = await runImplement({
      projectRoot,
      taskSpecId: '001',
      slug: 'oauth-login',
      featureDescription: 'Add OAuth login for user authentication',
      scenariosToAdd: [
        {
          name: 'User signs in with OAuth provider',
          steps: [
            'Given an unauthenticated user',
            'When the user chooses OAuth sign-in',
            'Then the user is authenticated',
          ],
        },
      ],
    });

    expect(result.livingSpecUpdated).toBe(true);
    expect(existsSync(result.featureFilePath)).toBe(true);

    const parsed = await readFeatureFile(result.featureFilePath);
    expect(parsed.scenarios).toHaveLength(1);
    expect(parsed.scenarios[0]?.name).toBe('User signs in with OAuth provider');
    expect(parsed.scenarios[0]?.tags).toContain(formatSpecNRollTag('001'));
  });

  it('updates an existing feature file with new scenarios', async () => {
    const projectRoot = createProjectRoot('update');
    const featurePath = path.join(projectRoot, 'living-specs', 'user-authentication.feature');
    mkdirSync(path.dirname(featurePath), { recursive: true });
    writeFileSync(
      featurePath,
      `Feature: User authentication

  @spec-n-roll-001
  Scenario: User signs in with password
    Given a registered user
    When the user signs in with a valid password
    Then the user is authenticated
`,
      'utf8',
    );
    await seedTaskSpecForImplement(projectRoot, '002', 'oauth-provider');

    const result = await runImplement({
      projectRoot,
      taskSpecId: '002',
      slug: 'oauth-provider',
      featureDescription: 'Add Google OAuth provider to user authentication',
      scenariosToAdd: [
        {
          name: 'User signs in with Google',
          steps: [
            'Given an unauthenticated user',
            'When the user signs in with Google',
            'Then the user is authenticated via Google',
          ],
        },
      ],
    });

    const parsed = await readFeatureFile(result.featureFilePath);
    expect(parsed.scenarios).toHaveLength(2);
    expect(parsed.scenarios[0]?.tags).toContain(formatSpecNRollTag('001'));
    expect(parsed.scenarios[1]?.tags).toContain(formatSpecNRollTag('002'));
  });

  it('preserves prior task tags when applying additive tags to modified scenarios', async () => {
    const projectRoot = createProjectRoot('tags');
    const featurePath = path.join(projectRoot, 'living-specs', 'notifications.feature');
    mkdirSync(path.dirname(featurePath), { recursive: true });
    writeFileSync(
      featurePath,
      `Feature: Notifications

  @spec-n-roll-001 @smoke
  Scenario: Order shipped email
    Given a shipped order
    When the shipment is recorded
    Then the customer receives an email
`,
      'utf8',
    );
    await seedTaskSpecForImplement(projectRoot, '002', 'sms-alerts');

    await runImplement({
      projectRoot,
      taskSpecId: '002',
      slug: 'sms-alerts',
      featureDescription: 'Add SMS alert for customer notifications',
      scenariosToUpdate: [
        {
          name: 'Order shipped email',
          steps: [
            'Given a shipped order',
            'When the shipment is recorded',
            'Then the customer receives an email and SMS',
          ],
        },
      ],
    });

    const content = readFileSync(featurePath, 'utf8');
    const parsed = parseFeatureFile(content);
    const scenario = parsed.scenarios.find((item) => item.name === 'Order shipped email');
    expect(scenario?.tags).toContain('@spec-n-roll-001');
    expect(scenario?.tags).toContain('@smoke');
    expect(scenario?.tags).toContain('@spec-n-roll-002');
    expect(scenario?.steps.join('\n')).toContain('email and SMS');
  });

  it('removes deprecated scenarios from living spec files', async () => {
    const projectRoot = createProjectRoot('deprecated');
    const featurePath = path.join(projectRoot, 'living-specs', 'payment-processing.feature');
    mkdirSync(path.dirname(featurePath), { recursive: true });
    writeFileSync(
      featurePath,
      `Feature: Payment processing

  Scenario: Legacy card form
    Given a legacy checkout
    When the user pays
    Then payment succeeds

  Scenario: Modern wallet checkout
    Given a wallet-enabled checkout
    When the user pays with wallet
    Then payment succeeds
`,
      'utf8',
    );
    await seedTaskSpecForImplement(projectRoot, '003', 'remove-legacy-card');

    await runImplement({
      projectRoot,
      taskSpecId: '003',
      slug: 'remove-legacy-card',
      featureDescription: 'Remove legacy card form from payment processing',
      deprecatedScenarioNames: ['Legacy card form'],
      scenariosToUpdate: [
        {
          name: 'Modern wallet checkout',
          steps: [
            'Given a wallet-enabled checkout',
            'When the user pays with wallet',
            'Then payment succeeds',
          ],
        },
      ],
    });

    const parsed = await readFeatureFile(featurePath);
    expect(parsed.scenarios.map((scenario) => scenario.name)).toEqual(['Modern wallet checkout']);
    expect(parsed.scenarios[0]?.tags).toContain(formatSpecNRollTag('003'));
  });
});
