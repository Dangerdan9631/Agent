import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

import { runUpdate, type UpdateResult } from '../../../commands/update.js';
import { UpdateConfirmPrompt } from '../../update-prompts.js';
import { useSession } from '../../app/session-context.js';

/**
 * Input accepted by the interactive update path.
 */
export interface InteractiveUpdateInput {
  /**
   * Absolute path to the initialized project root.
   */
  projectRoot: string;
  /**
   * When true, only report planned changes without writing files.
   */
  dryRun?: boolean;
  /**
   * Called after dry-run planning and before applying an update.
   */
  confirmUpdate: (plan: UpdateResult) => Promise<boolean> | boolean;
}

/**
 * Applies a toolkit update through the shared update command orchestrator.
 *
 * @param input - Project root, dry-run flag, and confirmation callback.
 * @returns Update orchestration summary.
 */
export async function applyInteractiveUpdate(input: InteractiveUpdateInput): Promise<UpdateResult> {
  if (input.dryRun === true) {
    return runUpdate({ projectRoot: input.projectRoot, dryRun: true });
  }

  const plan = await runUpdate({ projectRoot: input.projectRoot, dryRun: true });
  const confirmed = await input.confirmUpdate(plan);
  if (!confirmed) {
    throw new Error('Update cancelled.');
  }

  return runUpdate({ projectRoot: input.projectRoot, force: true });
}

/**
 * Renders dry-run and confirmed update actions for the current project.
 *
 * @returns React element for the update screen.
 */
export function SetupUpdateScreen(): React.ReactElement {
  const session = useSession();
  const [plan, setPlan] = useState<UpdateResult | null>(null);
  const [result, setResult] = useState<UpdateResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const runDryRun = (): void => {
    setRunning(true);
    setError(null);
    void applyInteractiveUpdate({
      projectRoot: session.projectRoot,
      dryRun: true,
      confirmUpdate: () => true,
    })
      .then((summary) => {
        setResult(summary);
        setMessage(`dry run: ${summary.overwrittenFiles.length} file(s) planned`);
      })
      .catch((unknownError: unknown) => {
        const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setError(text);
      })
      .finally(() => {
        setRunning(false);
      });
  };

  const planApply = (): void => {
    setRunning(true);
    setError(null);
    void runUpdate({ projectRoot: session.projectRoot, dryRun: true })
      .then(setPlan)
      .catch((unknownError: unknown) => {
        const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setError(text);
      })
      .finally(() => {
        setRunning(false);
      });
  };

  const applyPlan = (): void => {
    setRunning(true);
    setError(null);
    void runUpdate({ projectRoot: session.projectRoot, force: true })
      .then((summary) => {
        setResult(summary);
        setMessage(`updated: ${summary.overwrittenFiles.length} file(s) overwritten`);
      })
      .catch((unknownError: unknown) => {
        const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setError(text);
      })
      .finally(() => {
        setPlan(null);
        setRunning(false);
      });
  };

  useInput((input) => {
    if (plan != null || running) {
      return;
    }

    if (input === 'd') {
      runDryRun();
      return;
    }

    if (input === 'a') {
      planApply();
    }
  });

  if (plan != null) {
    return (
      <UpdateConfirmPrompt
        input={{
          previousToolkitVersion: plan.previousToolkitVersion,
          targetToolkitVersion: plan.targetToolkitVersion,
          filesToOverwrite: plan.overwrittenFiles,
          backupConflicts: plan.backupConflicts,
          migrationCount: plan.configMigrations.length,
          extensionWarnings: plan.extensionWarnings,
        }}
        onConfirm={applyPlan}
        onCancel={() => {
          setPlan(null);
        }}
      />
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Update Toolkit</Text>
      <Text>d dry-run, a apply with confirmation</Text>
      {running ? <Text color="gray">Running update...</Text> : null}
      {message != null ? <Text color="green">{message}</Text> : null}
      {result != null ? (
        <Text color="gray">
          {result.previousToolkitVersion} {'->'} {result.targetToolkitVersion}
        </Text>
      ) : null}
      {error != null ? <Text color="red">{error}</Text> : null}
    </Box>
  );
}
