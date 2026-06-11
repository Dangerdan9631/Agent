import React, { useState } from 'react';
import { render, Box, Text, useInput } from 'ink';

import type { BackupConflict } from '../../updates/backup.js';

/**
 * Input for the interactive update confirmation prompt.
 */
export interface UpdateConfirmationInput {
  /**
   * Toolkit version recorded in the project before update.
   */
  previousToolkitVersion: string;
  /**
   * Toolkit version from the running package.
   */
  targetToolkitVersion: string;
  /**
   * Project-relative toolkit-owned paths that will be overwritten.
   */
  filesToOverwrite: string[];
  /**
   * Toolkit-owned files that will receive `.bak` siblings.
   */
  backupConflicts: BackupConflict[];
  /**
   * Number of pending config migrations (US10).
   */
  migrationCount: number;
  /**
   * Extension compatibility warning messages.
   */
  extensionWarnings: string[];
}

/**
 * Interactive Ink confirmation before applying a toolkit update.
 *
 * @param input - Update summary shown to the developer.
 * @returns Promise resolving when the user confirms the update.
 */
export function promptForUpdateConfirmation(input: UpdateConfirmationInput): Promise<void> {
  return new Promise((resolve, reject) => {
    const app = render(
      <UpdateConfirmPrompt
        input={input}
        onConfirm={() => {
          app.unmount();
          resolve();
        }}
        onCancel={() => {
          app.unmount();
          reject(new Error('Update cancelled.'));
        }}
      />,
    );
  });
}

/**
 * Props for the update confirmation Ink component.
 */
interface UpdateConfirmPromptProps {
  /**
   * Update summary to display.
   */
  input: UpdateConfirmationInput;
  /**
   * Called when the user confirms the update.
   */
  onConfirm: () => void;
  /**
   * Called when the user cancels the update.
   */
  onCancel: () => void;
}

/**
 * Ink UI that summarizes an update and requires explicit confirmation.
 */
function UpdateConfirmPrompt({
  input,
  onConfirm,
  onCancel,
}: UpdateConfirmPromptProps): React.ReactElement {
  const [confirmed, setConfirmed] = useState(false);

  useInput((keyInput, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (keyInput.toLowerCase() === 'y') {
      setConfirmed(true);
      onConfirm();
    }

    if (keyInput.toLowerCase() === 'n') {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column">
      <Text>
        Update toolkit {input.previousToolkitVersion} → {input.targetToolkitVersion}?
      </Text>
      <Text>Toolkit-owned files to overwrite: {input.filesToOverwrite.length}</Text>
      <Text>Local modifications requiring .bak: {input.backupConflicts.length}</Text>
      {input.migrationCount > 0 ? (
        <Text>Config migrations pending: {input.migrationCount}</Text>
      ) : null}
      {input.extensionWarnings.map((warning) => (
        <Text key={warning}>Warning: {warning}</Text>
      ))}
      <Text>Press y to confirm, n or esc to cancel.{confirmed ? ' Applying…' : ''}</Text>
    </Box>
  );
}
